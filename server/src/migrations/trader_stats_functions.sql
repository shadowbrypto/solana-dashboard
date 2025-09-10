-- Function to get top traders across all protocols
CREATE OR REPLACE FUNCTION get_top_traders_across_protocols(
    start_date DATE,
    end_date DATE,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    user_address VARCHAR(255),
    total_volume DECIMAL(20, 2),
    protocols_traded TEXT[],
    protocol_count INTEGER,
    primary_protocol VARCHAR(50),
    primary_protocol_percentage DECIMAL(5, 2)
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH trader_aggregates AS (
        SELECT 
            ts.user_address,
            SUM(ts.volume_usd) as total_volume,
            ARRAY_AGG(DISTINCT ts.protocol_name) as protocols_traded,
            COUNT(DISTINCT ts.protocol_name) as protocol_count
        FROM trader_stats ts
        WHERE ts.date >= start_date AND ts.date <= end_date
        GROUP BY ts.user_address
    ),
    trader_primary_protocol AS (
        SELECT 
            ts.user_address,
            ts.protocol_name as primary_protocol,
            SUM(ts.volume_usd) as protocol_volume,
            ROW_NUMBER() OVER (PARTITION BY ts.user_address ORDER BY SUM(ts.volume_usd) DESC) as rn
        FROM trader_stats ts
        WHERE ts.date >= start_date AND ts.date <= end_date
        GROUP BY ts.user_address, ts.protocol_name
    )
    SELECT 
        ta.user_address,
        ta.total_volume,
        ta.protocols_traded,
        ta.protocol_count,
        tpp.primary_protocol,
        ROUND((tpp.protocol_volume / ta.total_volume * 100)::numeric, 2) as primary_protocol_percentage
    FROM trader_aggregates ta
    LEFT JOIN trader_primary_protocol tpp ON ta.user_address = tpp.user_address AND tpp.rn = 1
    ORDER BY ta.total_volume DESC
    LIMIT limit_count;
END;
$$;