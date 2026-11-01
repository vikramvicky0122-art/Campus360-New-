-- ====================================================================
-- Campus360: Razorpay Test Mode & Rental Escrow Settlement Migration
-- Target Platform: Supabase PostgreSQL
-- ====================================================================

-- 1. Modify PAYMENTS table provider constraint to allow Razorpay Test Mode
ALTER TABLE public.payments 
    DROP CONSTRAINT IF EXISTS payments_provider_check;

ALTER TABLE public.payments 
    ADD CONSTRAINT payments_provider_check 
    CHECK (provider IN ('YouPI-PG', 'RAZORPAY_TEST', 'RAZORPAY'));

-- 2. Add Razorpay-specific columns to PAYMENTS table
ALTER TABLE public.payments 
    ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order ON public.payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment ON public.payments(razorpay_payment_id);

-- 3. Add Seller Settlement Status & Commission Rate to ORDERS table
ALTER TABLE public.orders 
    ADD COLUMN IF NOT EXISTS seller_settlement_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_SETTLEMENT' 
    CHECK (seller_settlement_status IN ('PENDING_SETTLEMENT', 'SETTLED', 'CANCELLED')),
    ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) NOT NULL DEFAULT 'RAZORPAY_TEST';

CREATE INDEX IF NOT EXISTS idx_orders_settlement_status ON public.orders(seller_settlement_status);

-- 4. Set Default Platform Commission to 10% for Campus360 Prototype
UPDATE public.platform_settings 
SET commission_percentage = 10.00 
WHERE id = 's0000000-0000-0000-0000-000000000001' OR true;

-- 5. ROW-LEVEL SECURITY (RLS) POLICIES FOR PAYMENTS & SETTLEMENTS

-- Enable RLS on Payments and Transactions
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing overlapping policies if any
DROP POLICY IF EXISTS "Buyer and admin can view payment records" ON public.payments;
DROP POLICY IF EXISTS "Students view own payments" ON public.payments;
DROP POLICY IF EXISTS "Admins view all payments" ON public.payments;

-- Students can ONLY view payments where they are the buyer
CREATE POLICY "Students view own payments" ON public.payments
    FOR SELECT TO authenticated
    USING (buyer_id = auth.uid() OR public.is_admin());

-- Disallow direct INSERT/UPDATE/DELETE from client to PAYMENTS table
-- (Payments must be created & verified via server-side Edge Functions with service role)
DROP POLICY IF EXISTS "Server only insert payments" ON public.payments;
DROP POLICY IF EXISTS "No client updates on payments" ON public.payments;

-- Sellers can only view transactions related to their seller credit earnings
DROP POLICY IF EXISTS "Sellers view own credits and buyers view payments" ON public.transactions;

CREATE POLICY "Sellers view own credits and buyers view payments" ON public.transactions
    FOR SELECT TO authenticated
    USING (
        public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = transactions.order_id 
              AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
        )
    );

