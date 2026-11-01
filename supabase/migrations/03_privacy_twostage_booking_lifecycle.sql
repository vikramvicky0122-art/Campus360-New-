-- ====================================================================
-- Campus360: Privacy-Protected Marketplace, Two-Stage Payment,
-- Booking Lifecycle & Supabase Security Audit Migration
-- Target Platform: Supabase PostgreSQL
-- ====================================================================

-- 1. MIGRATE ROLES TO STRICTLY 'admin' AND 'user' (NO 'student', 'moderator', etc.)
-- Migrate any existing legacy 'student' roles in profiles to 'user'
UPDATE public.profiles
SET role = 'user'
WHERE role = 'student' OR role NOT IN ('admin', 'user');

-- Update constraint on public.profiles
ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'user'));

-- Ensure default role is 'user'
ALTER TABLE public.profiles
    ALTER COLUMN role SET DEFAULT 'user';

-- 2. AUTOMATIC PROFILE CREATION TRIGGER WITH ROLE = 'user'
-- Security Guarantee: Public signups ALWAYS receive role = 'user'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone,
        institution_id,
        department,
        year_of_study,
        roll_number,
        role,
        is_verified,
        is_suspended,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Student User'),
        COALESCE(NEW.raw_user_meta_data->>'phone', '+91 90000 00000'),
        COALESCE((NEW.raw_user_meta_data->>'institution_id')::uuid, (SELECT id FROM public.institutions LIMIT 1)),
        COALESCE(NEW.raw_user_meta_data->>'department', 'General'),
        COALESCE((NEW.raw_user_meta_data->>'year_of_study')::smallint, 1),
        COALESCE(NEW.raw_user_meta_data->>'roll_number', 'PENDING-' || substr(NEW.id::text, 1, 6)),
        'user', -- STRICT: Public signups are ALWAYS 'user', never 'admin'
        false,  -- Requires administrative student verification
        false,
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users if auth schema is accessible
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- 3. TWO-STAGE PAYMENT & BOOKING LIFECYCLE COLUMNS ON ORDERS
ALTER TABLE public.orders
    DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_status_check CHECK (status IN (
        'REQUESTED',
        'FEE_PENDING',
        'FEE_PAID',
        'PENDING_ADMIN_APPROVAL',
        'APPROVED',
        'REJECTED',
        'SELLER_DETAILS_REVEALED',
        'RENTAL_PAYMENT_PENDING',
        'RENTAL_PAYMENT_REPORTED',
        'ACTIVE',
        'RETURN_REQUESTED',
        'COMPLETION_PENDING',
        'COMPLETED',
        'CANCELLED',
        'REFUND_PENDING',
        'REFUNDED',
        'PAID',
        'ACCEPTED',
        'READY_FOR_HANDOVER'
    ));

-- Add columns for Two-Stage Payment tracking and Admin Approval
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS booking_stage VARCHAR(40) NOT NULL DEFAULT 'STAGE_1_BOOKING_FEE',
    ADD COLUMN IF NOT EXISTS booking_fee_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rental_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS booking_fee_payment_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS booking_fee_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (booking_fee_status IN ('PENDING', 'PAID', 'REFUND_PENDING', 'REFUNDED')),
    ADD COLUMN IF NOT EXISTS admin_review_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (admin_review_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS seller_details_revealed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rental_payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (rental_payment_status IN ('PENDING', 'REPORTED', 'PAID')),
    ADD COLUMN IF NOT EXISTS rental_payment_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS rental_payment_reference VARCHAR(100),
    ADD COLUMN IF NOT EXISTS rental_payment_reported_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completion_requested_by_seller_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completion_confirmed_by_buyer_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_admin_review ON public.orders(admin_review_status);
CREATE INDEX IF NOT EXISTS idx_orders_booking_stage ON public.orders(booking_stage);
CREATE INDEX IF NOT EXISTS idx_orders_booking_fee_status ON public.orders(booking_fee_status);

-- 4. AUDITABLE BOOKING STATUS HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.booking_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_booking_history_order ON public.booking_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_booking_history_created ON public.booking_status_history(created_at);

-- 5. SELLER PRIVACY: SECURE RPC FOR APPROVED BUYER CONTACT REVEAL
-- Ensures seller phone, email, and WhatsApp are NEVER exposed to unapproved buyers.
CREATE OR REPLACE FUNCTION public.get_seller_contact_for_approved_booking(p_order_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_seller RECORD;
    v_is_approved BOOLEAN;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    -- Security Authorization Check:
    -- Only buyer or admin can call this, and booking must be APPROVED
    IF (auth.uid() != v_order.buyer_id AND NOT public.is_admin()) THEN
        RAISE EXCEPTION 'Unauthorized: You are not the authorized buyer for this booking';
    END IF;

    IF (v_order.admin_review_status != 'APPROVED' AND NOT public.is_admin()) THEN
        RAISE EXCEPTION 'Seller details are locked until booking is approved by campus administration';
    END IF;

    -- Fetch seller details
    SELECT id, full_name, phone, email, department, roll_number INTO v_seller
    FROM public.profiles
    WHERE id = v_order.seller_id;

    -- Log revealed timestamp if not already set
    IF v_order.seller_details_revealed_at IS NULL THEN
        UPDATE public.orders
        SET seller_details_revealed_at = now()
        WHERE id = p_order_id;
    END IF;

    RETURN jsonb_build_object(
        'sellerId', v_seller.id,
        'fullName', v_seller.full_name,
        'phone', v_seller.phone,
        'email', v_seller.email,
        'whatsapp', v_seller.phone,
        'department', v_seller.department,
        'rollNumber', v_seller.roll_number,
        'handoverLocation', v_order.handover_location,
        'handoverNotes', v_order.handover_notes,
        'revealedAt', now(),
        'bookingId', p_order_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. ROW LEVEL SECURITY (RLS) POLICIES AUDIT & ENFORCEMENT

-- A) Profiles: Disallow normal users from elevating their own role
DROP POLICY IF EXISTS "Users can update own non-sensitive profile" ON public.profiles;

CREATE POLICY "Users can update own non-sensitive profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        role = (SELECT role FROM public.profiles WHERE id = auth.uid()) -- FORBIDS ROLE ESCALATION
    );

-- B) Booking History RLS: Participants & admin can view
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view booking history" ON public.booking_status_history
    FOR SELECT TO authenticated
    USING (
        public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = booking_status_history.order_id
              AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
        )
    );

-- C) Orders RLS: Protect Buyer & Seller Privacy
DROP POLICY IF EXISTS "Participants can update order state" ON public.orders;

CREATE POLICY "Participants can update order state" ON public.orders
    FOR UPDATE TO authenticated
    USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin());

