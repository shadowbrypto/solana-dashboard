-- Database Migration: Rename "bonkbot terminal" to "telemetry"
-- This script will:
-- 1. Delete all existing "bonkbot terminal" data
-- 2. Update any remaining references to use "telemetry"
-- 
-- Run this script against your Supabase database

BEGIN;

-- Step 1: Check existing data before migration
SELECT 
    protocol_name,
    chain,
    data_type,
    COUNT(*) as record_count,
    MIN(date) as earliest_date,
    MAX(date) as latest_date
FROM protocol_stats 
WHERE protocol_name = 'bonkbot terminal'
GROUP BY protocol_name, chain, data_type;

-- Step 2: Delete all "bonkbot terminal" data from protocol_stats table
DELETE FROM protocol_stats 
WHERE protocol_name = 'bonkbot terminal';

-- Step 3: Verify deletion
SELECT COUNT(*) as remaining_bonkbot_terminal_records 
FROM protocol_stats 
WHERE protocol_name = 'bonkbot terminal';

-- Step 4: Check if there are any "telemetry" records (should be none initially)
SELECT COUNT(*) as existing_telemetry_records 
FROM protocol_stats 
WHERE protocol_name = 'telemetry';

-- Step 5: Update any other tables that might reference protocol names
-- (Add other tables here if they exist and reference protocol names)

-- If there's a protocol_configurations table:
-- UPDATE protocol_configurations 
-- SET protocol_id = 'telemetry', name = 'Telemetry'
-- WHERE protocol_id = 'bonkbot terminal';

-- If there's a protocol_sync_status table:
UPDATE protocol_sync_status 
SET protocol_name = 'telemetry'
WHERE protocol_name = 'bonkbot terminal';

-- Step 6: Final verification
SELECT 
    'After Migration' as status,
    protocol_name,
    COUNT(*) as record_count
FROM protocol_stats 
WHERE protocol_name IN ('bonkbot terminal', 'telemetry')
GROUP BY protocol_name;

COMMIT;

-- Note: After running this migration, you should sync fresh data for "telemetry"
-- using the API endpoint: POST /api/sync/protocol/telemetry