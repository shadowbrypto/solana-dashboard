-- Migration: Add projected_stats table
-- Purpose: Store projected volume data from Dune Analytics for each protocol

-- Create projected_stats table
CREATE TABLE IF NOT EXISTS projected_stats (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    protocol_name VARCHAR(255) NOT NULL,
    volume DECIMAL(20, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, protocol_name)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projected_stats_date ON projected_stats(date);
CREATE INDEX IF NOT EXISTS idx_projected_stats_protocol ON projected_stats(protocol_name);
CREATE INDEX IF NOT EXISTS idx_projected_stats_date_protocol ON projected_stats(date, protocol_name);

-- Add comments for documentation
COMMENT ON TABLE projected_stats IS 'Stores projected volume data from Dune Analytics for each trading protocol';
COMMENT ON COLUMN projected_stats.date IS 'The date for which the projected volume is calculated';
COMMENT ON COLUMN projected_stats.protocol_name IS 'The protocol identifier (matches protocol IDs in protocol config)';
COMMENT ON COLUMN projected_stats.volume IS 'The projected volume in USD';
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