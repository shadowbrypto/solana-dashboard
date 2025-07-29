-- Create launchpad_stats table for storing launchpad metrics
CREATE TABLE launchpad_stats (
    id BIGSERIAL PRIMARY KEY,
    launchpad_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    launches INTEGER DEFAULT 0,
    graduations INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate entries for same launchpad on same date
ALTER TABLE launchpad_stats 
ADD CONSTRAINT unique_launchpad_date 
UNIQUE (launchpad_name, date);

-- Create indexes for better query performance
CREATE INDEX idx_launchpad_stats_launchpad_name ON launchpad_stats (launchpad_name);
CREATE INDEX idx_launchpad_stats_date ON launchpad_stats (date);
CREATE INDEX idx_launchpad_stats_date_desc ON launchpad_stats (date DESC);

-- Create composite index for common queries (launchpad + date range)
CREATE INDEX idx_launchpad_stats_launchpad_date ON launchpad_stats (launchpad_name, date);

-- Add comments for documentation
COMMENT ON TABLE launchpad_stats IS 'Daily metrics for Solana launchpad platforms';
COMMENT ON COLUMN launchpad_stats.launchpad_name IS 'Name of the launchpad platform (e.g., pumpfun)';
COMMENT ON COLUMN launchpad_stats.date IS 'Date of the metrics (YYYY-MM-DD format)';
COMMENT ON COLUMN launchpad_stats.launches IS 'Number of tokens launched on this date';
COMMENT ON COLUMN launchpad_stats.graduations IS 'Number of tokens that graduated on this date';
COMMENT ON COLUMN launchpad_stats.created_at IS 'Timestamp when record was created';
COMMENT ON COLUMN launchpad_stats.updated_at IS 'Timestamp when record was last updated';

-- Optional: Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on record changes
CREATE TRIGGER update_launchpad_stats_updated_at 
    BEFORE UPDATE ON launchpad_stats 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();