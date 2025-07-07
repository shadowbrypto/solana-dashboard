-- Migration: Add chain support to protocol_metrics table
-- This migration adds a chain column to support multi-chain data (Solana + EVM chains)

-- Add chain column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'protocol_metrics' AND column_name = 'chain') THEN
        ALTER TABLE protocol_metrics 
        ADD COLUMN chain VARCHAR(20) DEFAULT 'solana';
        
        -- Add index for efficient chain filtering
        CREATE INDEX idx_protocol_metrics_chain ON protocol_metrics(chain);
        
        -- Add composite index for chain + protocol queries
        CREATE INDEX idx_protocol_metrics_chain_protocol ON protocol_metrics(chain, protocol_name);
        
        RAISE NOTICE 'Added chain column and indexes to protocol_metrics table';
    ELSE
        RAISE NOTICE 'Chain column already exists in protocol_metrics table';
    END IF;
END $$;

-- Update existing records to have 'solana' as default chain
UPDATE protocol_metrics 
SET chain = 'solana' 
WHERE chain IS NULL OR chain = '';

-- Make chain column NOT NULL after setting defaults
ALTER TABLE protocol_metrics 
ALTER COLUMN chain SET NOT NULL;

COMMENT ON COLUMN protocol_metrics.chain IS 'Blockchain network: solana, ethereum, base, arbitrum, bsc, avax, etc.';