-- AlterTable: Add orderAmount, platformFee, orderType, and commissionRate if they don't exist
-- This migration ensures these columns exist even if previous migrations weren't applied

DO $$ 
BEGIN
    -- Add orderAmount column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Order' AND column_name = 'orderAmount'
    ) THEN
        ALTER TABLE "Order" ADD COLUMN "orderAmount" DOUBLE PRECISION;
    END IF;

    -- Add platformFee column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Order' AND column_name = 'platformFee'
    ) THEN
        ALTER TABLE "Order" ADD COLUMN "platformFee" DOUBLE PRECISION;
    END IF;

    -- Add orderType column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Order' AND column_name = 'orderType'
    ) THEN
        ALTER TABLE "Order" ADD COLUMN "orderType" TEXT DEFAULT 'ON_DEMAND';
    END IF;

    -- Add commissionRate column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Order' AND column_name = 'commissionRate'
    ) THEN
        ALTER TABLE "Order" ADD COLUMN "commissionRate" DOUBLE PRECISION;
    END IF;
END $$;
