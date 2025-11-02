-- Migration: Add fee_usd column to trader_stats table
-- Purpose: Track fees paid by traders alongside their volume
-- Date: 2025-01-01

-- Add fee_usd column to trader_stats table
ALTER TABLE trader_stats
ADD COLUMN IF NOT EXISTS fee_usd NUMERIC(20, 2) DEFAULT 0;

-- Add index for performance when querying by protocol and fees
CREATE INDEX IF NOT EXISTS idx_trader_stats_fee
ON trader_stats(protocol_name, fee_usd DESC);

-- Add comment to document the column
COMMENT ON COLUMN trader_stats.fee_usd IS 'Total fees paid by trader in USD across all transactions';

-- Verify the migration
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trader_stats'
        AND column_name = 'fee_usd'
    ) THEN
        RAISE NOTICE 'SUCCESS: fee_usd column added to trader_stats table';
    ELSE
        RAISE EXCEPTION 'FAILED: fee_usd column was not added';
    END IF;
END $$;
