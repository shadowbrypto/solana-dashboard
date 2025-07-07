-- Create protocol sync status table
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_protocol_sync_status_success ON protocol_sync_status(sync_success);
CREATE INDEX IF NOT EXISTS idx_protocol_sync_status_recent_data ON protocol_sync_status(has_recent_data);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_protocol_sync_status_updated_at 
  BEFORE UPDATE ON protocol_sync_status 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();