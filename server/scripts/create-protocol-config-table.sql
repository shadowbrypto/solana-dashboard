-- Create the protocol_configurations table
-- This should be run in Supabase SQL editor

-- Create the table
CREATE TABLE IF NOT EXISTS protocol_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_id TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_protocol_configurations_protocol_id 
ON protocol_configurations(protocol_id);

CREATE INDEX IF NOT EXISTS idx_protocol_configurations_category 
ON protocol_configurations(category);

-- Enable Row Level Security (RLS)
ALTER TABLE protocol_configurations ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on protocol_configurations" 
ON protocol_configurations 
FOR ALL 
USING (true) 
WITH CHECK (true);