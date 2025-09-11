-- Create table for pre-calculated percentile data
CREATE TABLE IF NOT EXISTS protocol_percentiles (
    id SERIAL PRIMARY KEY,
    protocol_name TEXT NOT NULL,
    percentile INTEGER NOT NULL,
    trader_count INTEGER NOT NULL,
    rank_range TEXT NOT NULL,
    volume_usd NUMERIC(20, 2) NOT NULL,
    volume_share NUMERIC(5, 2) NOT NULL,
    total_volume NUMERIC(20, 2) NOT NULL,
    total_traders INTEGER NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(protocol_name, percentile)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_protocol_percentiles_protocol ON protocol_percentiles(protocol_name);
CREATE INDEX IF NOT EXISTS idx_protocol_percentiles_calculated ON protocol_percentiles(calculated_at);

-- Function to refresh percentiles for a protocol
CREATE OR REPLACE FUNCTION refresh_protocol_percentiles(protocol_name_param TEXT)
RETURNS VOID AS $$
DECLARE
    total_traders_count INTEGER;
    total_volume_sum NUMERIC(20, 2);
    percentile_val INTEGER;
    rank_cutoff INTEGER;
    bracket_volume NUMERIC(20, 2);
    bracket_count INTEGER;
    volume_share_val NUMERIC(5, 2);
    rank_range_val TEXT;
BEGIN
    -- Get total stats for the protocol
    SELECT COUNT(*), SUM(volume_usd)
    INTO total_traders_count, total_volume_sum
    FROM trader_stats 
    WHERE protocol_name = protocol_name_param;
    
    -- Delete existing percentiles for this protocol
    DELETE FROM protocol_percentiles WHERE protocol_name = protocol_name_param;
    
    -- Calculate and insert percentiles
    FOR percentile_val IN SELECT unnest(ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 50, 75, 100]) LOOP
        -- Calculate rank cutoff
        rank_cutoff := FLOOR((percentile_val / 100.0) * total_traders_count);
        
        -- Calculate volume for this percentile bracket
        SELECT COALESCE(SUM(volume_usd), 0), COUNT(*)
        INTO bracket_volume, bracket_count
        FROM (
            SELECT volume_usd
            FROM trader_stats 
            WHERE protocol_name = protocol_name_param
            ORDER BY volume_usd DESC
            LIMIT rank_cutoff
        ) top_traders;
        
        -- Calculate volume share
        volume_share_val := CASE 
            WHEN total_volume_sum > 0 THEN (bracket_volume / total_volume_sum) * 100
            ELSE 0
        END;
        
        -- Create rank range
        rank_range_val := CASE 
            WHEN bracket_count > 0 THEN '1-' || bracket_count::TEXT
            ELSE '0'
        END;
        
        -- Insert the percentile data
        INSERT INTO protocol_percentiles (
            protocol_name, percentile, trader_count, rank_range, 
            volume_usd, volume_share, total_volume, total_traders
        ) VALUES (
            protocol_name_param, percentile_val, bracket_count, rank_range_val,
            bracket_volume, volume_share_val, total_volume_sum, total_traders_count
        );
    END LOOP;
    
    RAISE NOTICE 'Refreshed percentiles for protocol: %', protocol_name_param;
END;
$$ LANGUAGE plpgsql;

-- Refresh percentiles for existing protocols
DO $$
DECLARE
    protocol_record RECORD;
BEGIN
    FOR protocol_record IN 
        SELECT DISTINCT protocol_name 
        FROM trader_stats 
        WHERE protocol_name IN ('axiom', 'photon')
    LOOP
        PERFORM refresh_protocol_percentiles(protocol_record.protocol_name);
    END LOOP;
END $$;