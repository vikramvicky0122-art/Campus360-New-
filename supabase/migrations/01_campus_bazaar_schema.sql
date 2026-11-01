-- ====================================================================
-- Campus Bazaar: PostgreSQL Database Schema & Row-Level Security (RLS)
-- Target Platform: Supabase PostgreSQL
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. INSTITUTIONS TABLE
CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    domain VARCHAR(100) NOT NULL UNIQUE,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. PROFILES TABLE (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    avatar_url TEXT,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    department VARCHAR(100) NOT NULL,
    year_of_study SMALLINT NOT NULL CHECK (year_of_study BETWEEN 1 AND 6),
    roll_number VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_suspended BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Unique roll number constraint within the same college institution
    CONSTRAINT unique_institution_roll_number UNIQUE (institution_id, roll_number)
);

-- 3. STUDENT VERIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.student_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    roll_number VARCHAR(50) NOT NULL,
    college_email VARCHAR(255) NOT NULL,
    document_url TEXT NOT NULL,
    document_type VARCHAR(50) NOT NULL DEFAULT 'STUDENT_ID_CARD',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50) NOT NULL,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
    original_price NUMERIC(10, 2) CHECK (original_price IS NULL OR original_price >= price),
    condition VARCHAR(20) NOT NULL CHECK (condition IN ('New', 'Like New', 'Good', 'Used')),
    department VARCHAR(100) NOT NULL,
    availability_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (availability_status IN ('AVAILABLE', 'RESERVED', 'SOLD', 'REMOVED')),
    view_count INT NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. PRODUCT IMAGES TABLE
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. FAVOURITES TABLE
CREATE TABLE IF NOT EXISTS public.favourites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_student_product_favourite UNIQUE (student_id, product_id)
);

-- 8. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(30) NOT NULL UNIQUE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount > 0),
    platform_commission NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (platform_commission >= 0),
    seller_net_amount NUMERIC(10, 2) NOT NULL CHECK (seller_net_amount >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT' CHECK (status IN (
        'PENDING_PAYMENT',
        'PAID',
        'ACCEPTED',
        'READY_FOR_HANDOVER',
        'COMPLETED',
        'CANCELLED',
        'REFUND_PENDING',
        'REFUNDED'
    )),
    handover_location VARCHAR(200) NOT NULL,
    handover_notes TEXT,
    payment_reference_id VARCHAR(100),
    gateway_order_id VARCHAR(100),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT prevent_self_purchase CHECK (buyer_id != seller_id)
);

-- 9. PAYMENTS TABLE (YouPI-PG Gateway Records)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    provider VARCHAR(50) NOT NULL DEFAULT 'YouPI-PG',
    gateway_order_id VARCHAR(100) NOT NULL UNIQUE,
    payment_reference_id VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'SUCCESS', 'FAILED', 'CANCELLED')),
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    method VARCHAR(50) NOT NULL DEFAULT 'UPI',
    upi_id VARCHAR(100),
    raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. TRANSACTIONS TABLE (Accounting Ledger)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('PAYMENT', 'COMMISSION_FEE', 'SELLER_CREDIT', 'REFUND')),
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'PENDING', 'FAILED')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message_text TEXT,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_buyer_seller_product_convo UNIQUE (product_id, buyer_id, seller_id)
);

-- 12. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('VERIFICATION', 'ORDER', 'PAYMENT', 'MESSAGE', 'SYSTEM')),
    related_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. PLATFORM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 5.00 CHECK (commission_percentage >= 0 AND commission_percentage <= 50),
    allowed_domains JSONB NOT NULL DEFAULT '["edu", "ac.in", "edu.in"]'::jsonb,
    maintenance_mode BOOLEAN NOT NULL DEFAULT false,
    support_email VARCHAR(255) NOT NULL DEFAULT 'support@campusbazaar.edu',
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 15. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- INDEXES FOR HIGH-THROUGHPUT CAMPUS QUERIES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_products_institution_avail ON public.products(institution_id, availability_status);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_seller ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_student_verifications_status ON public.student_verifications(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);

-- ====================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favourites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper security functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_verified_student()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_verified = true AND is_suspended = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Anyone authenticated can read basic profile info; only self or admin can update
CREATE POLICY "Public profile view" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own non-sensitive profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND 
        role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
        is_verified = (SELECT is_verified FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Admin full manage profiles" ON public.profiles
    FOR ALL TO authenticated USING (public.is_admin());

-- Products: Anyone authenticated can view active listings; only verified students can insert
CREATE POLICY "View active products" ON public.products
    FOR SELECT TO authenticated
    USING (availability_status = 'AVAILABLE' OR seller_id = auth.uid() OR public.is_admin());

CREATE POLICY "Verified students can create products" ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = seller_id AND public.is_verified_student());

CREATE POLICY "Sellers can update own products" ON public.products
    FOR UPDATE TO authenticated
    USING (auth.uid() = seller_id OR public.is_admin());

CREATE POLICY "Sellers can delete own products" ON public.products
    FOR DELETE TO authenticated
    USING (auth.uid() = seller_id OR public.is_admin());

-- Student Verifications: Student can see their own; only admins can review/update
CREATE POLICY "Students see own verifications" ON public.student_verifications
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.is_admin());

CREATE POLICY "Students submit verification" ON public.student_verifications
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "Only admins can update verification status" ON public.student_verifications
    FOR UPDATE TO authenticated
    USING (public.is_admin());

-- Orders: Buyer and Seller can see their orders; only verified can purchase
CREATE POLICY "Order participants and admins can view orders" ON public.orders
    FOR SELECT TO authenticated
    USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin());

CREATE POLICY "Verified students can initiate orders" ON public.orders
    FOR INSERT TO authenticated
    WITH CHECK (buyer_id = auth.uid() AND public.is_verified_student());

CREATE POLICY "Participants can update order state" ON public.orders
    FOR UPDATE TO authenticated
    USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin());

-- Payments: Only involved buyer or admin can see payment records; no client updates allowed
CREATE POLICY "Buyer and admin can view payment records" ON public.payments
    FOR SELECT TO authenticated
    USING (buyer_id = auth.uid() OR public.is_admin());

-- Messages: Only conversation participants can read & write
CREATE POLICY "Participants view messages" ON public.messages
    FOR SELECT TO authenticated
    USING (sender_id = auth.uid() OR receiver_id = auth.uid() OR public.is_admin());

CREATE POLICY "Send message" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (sender_id = auth.uid());
