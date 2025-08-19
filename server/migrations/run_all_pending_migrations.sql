-- Run all pending migrations for production
-- This script creates all necessary tables that are missing in production

-- 1. Create protocol_sync_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS protocol_sync_status (
  protocol_name VARCHAR(255) PRIMARY KEY,
  last_sync_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sync_success BOOLEAN NOT NULL DEFAULT false,
  rows_imported INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  has_recent_data BOOLEAN NOT NULL DEFAULT false,
  latest_data_date DATE,
  days_behind INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for protocol_sync_status
CREATE INDEX IF NOT EXISTS idx_protocol_sync_status_success ON protocol_sync_status(sync_success);
CREATE INDEX IF NOT EXISTS idx_protocol_sync_status_recent_data ON protocol_sync_status(has_recent_data);

-- 2. Create or recreate projected_stats table with correct schema
DROP TABLE IF EXISTS projected_stats CASCADE;

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

-- Add indexes for projected_stats
CREATE INDEX idx_projected_stats_formatted_day ON projected_stats(formatted_day);
CREATE INDEX idx_projected_stats_protocol ON projected_stats(protocol_name);
CREATE INDEX idx_projected_stats_protocol_day ON projected_stats(protocol_name, formatted_day);
CREATE INDEX idx_projected_stats_volume_usd ON projected_stats(volume_usd);

-- 3. Create update trigger function (shared by multiple tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Create triggers for both tables
CREATE TRIGGER update_protocol_sync_status_updated_at 
  BEFORE UPDATE ON protocol_sync_status 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projected_stats_updated_at
    BEFORE UPDATE ON projected_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Add table comments for documentation
COMMENT ON TABLE protocol_sync_status IS 'Tracks the sync status of each protocol data import';
COMMENT ON TABLE projected_stats IS 'Stores projected trading data from Dune Analytics for each trading protocol';

-- 6. Verify tables were created successfully
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'protocol_sync_status') THEN
        RAISE NOTICE 'Table protocol_sync_status created successfully';
    ELSE
        RAISE EXCEPTION 'Failed to create protocol_sync_status table';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projected_stats') THEN
        RAISE NOTICE 'Table projected_stats created successfully';
    ELSE
        RAISE EXCEPTION 'Failed to create projected_stats table';
    END IF;
END
$$;