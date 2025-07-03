-- Add chain column to protocol_stats table
ALTER TABLE protocol_stats 
ADD COLUMN IF NOT EXISTS chain VARCHAR(50) DEFAULT 'solana';

-- Create index on chain for better query performance
CREATE INDEX IF NOT EXISTS idx_protocol_stats_chain ON protocol_stats(chain);

-- Create composite index for protocol_name and chain
CREATE INDEX IF NOT EXISTS idx_protocol_stats_protocol_chain ON protocol_stats(protocol_name, chain);