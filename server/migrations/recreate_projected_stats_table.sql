-- Migration: Recreate projected_stats table with new CSV structure
-- Purpose: Update table schema to match Dune CSV format with all required columns

-- Drop existing table and any dependent objects
DROP TABLE IF EXISTS projected_stats CASCADE;

-- Drop the trigger function if it exists
DROP FUNCTION IF EXISTS update_projected_stats_updated_at() CASCADE;

-- Create new projected_stats table with CSV structure
CREATE TABLE projected_stats (
    id SERIAL PRIMARY KEY,
    protocol_name VARCHAR(255) NOT NULL,
    formatted_day DATE NOT NULL,
    fees_sol DECIMAL(20, 8) DEFAULT 0,
    volume_sol DECIMAL(20, 8) DEFAULT 0,
    fees_usd DECIMAL(20, 2) DEFAULT 0,
    volume_usd DECIMAL(20, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(protocol_name, formatted_day)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projected_stats_formatted_day ON projected_stats(formatted_day);
CREATE INDEX IF NOT EXISTS idx_projected_stats_protocol ON projected_stats(protocol_name);
CREATE INDEX IF NOT EXISTS idx_projected_stats_protocol_day ON projected_stats(protocol_name, formatted_day);
CREATE INDEX IF NOT EXISTS idx_projected_stats_volume_usd ON projected_stats(volume_usd);

-- Add comments for documentation
COMMENT ON TABLE projected_stats IS 'Stores projected trading data from Dune Analytics for each trading protocol';
COMMENT ON COLUMN projected_stats.protocol_name IS 'The protocol identifier (matches protocol IDs in protocol config)';
COMMENT ON COLUMN projected_stats.formatted_day IS 'The date for which the projected data is calculated';
COMMENT ON COLUMN projected_stats.fees_sol IS 'Fees collected in SOL for the day';
COMMENT ON COLUMN projected_stats.volume_sol IS 'Trading volume in SOL for the day';
COMMENT ON COLUMN projected_stats.fees_usd IS 'Fees collected in USD for the day';
COMMENT ON COLUMN projected_stats.volume_usd IS 'Trading volume in USD for the day';
COMMENT ON COLUMN projected_stats.created_at IS 'When the record was first created';
COMMENT ON COLUMN projected_stats.updated_at IS 'When the record was last updated';

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_projected_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_projected_stats_updated_at
    BEFORE UPDATE ON projected_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_projected_stats_updated_at();