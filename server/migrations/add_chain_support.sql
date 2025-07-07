-- Migration: Add chain support to protocol_stats table
-- This migration adds a chain column to support multi-chain data (Solana + EVM chains)

-- Add chain column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'protocol_stats' AND column_name = 'chain') THEN
        ALTER TABLE protocol_stats 
        ADD COLUMN chain VARCHAR(20) DEFAULT 'solana';
        
        -- Add index for efficient chain filtering
        CREATE INDEX idx_protocol_stats_chain ON protocol_stats(chain);
        
        -- Add composite index for chain + protocol queries
        CREATE INDEX idx_protocol_stats_chain_protocol ON protocol_stats(chain, protocol_name);
        
        RAISE NOTICE 'Added chain column and indexes to protocol_stats table';
    ELSE
        RAISE NOTICE 'Chain column already exists in protocol_stats table';
    END IF;
END $$;

-- Update existing records to have 'solana' as default chain
UPDATE protocol_stats 
SET chain = 'solana' 
WHERE chain IS NULL OR chain = '';

-- Make chain column NOT NULL after setting defaults
ALTER TABLE protocol_stats 
ALTER COLUMN chain SET NOT NULL;

COMMENT ON COLUMN protocol_stats.chain IS 'Blockchain network: solana, ethereum, base, arbitrum, bsc, avax, etc.';