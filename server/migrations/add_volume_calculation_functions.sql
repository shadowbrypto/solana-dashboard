-- Create function to calculate total volume for a protocol
CREATE OR REPLACE FUNCTION calculate_protocol_total_volume(protocol_name text)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(volume_usd), 0)
  FROM trader_stats 
  WHERE protocol_name = $1;
$$;

-- Create function to get protocol statistics summary
CREATE OR REPLACE FUNCTION get_protocol_stats_summary(protocol_name text)
RETURNS TABLE (
  total_traders bigint,
  total_volume numeric,
  avg_volume_per_trader numeric,
  top_1_percent_volume numeric,
  top_5_percent_volume numeric,
  percentile_99_volume numeric,
  percentile_95_volume numeric
)
LANGUAGE sql
STABLE
AS $$
  WITH protocol_data AS (
    SELECT volume_usd,
           ROW_NUMBER() OVER (ORDER BY volume_usd DESC) as rank,
           COUNT(*) OVER () as total_count
    FROM trader_stats 
    WHERE protocol_name = $1
  ),
  volume_stats AS (
    SELECT 
      COUNT(*) as total_traders,
      SUM(volume_usd) as total_volume,
      AVG(volume_usd) as avg_volume_per_trader
    FROM trader_stats 
    WHERE protocol_name = $1
  ),
  top_percentiles AS (
    SELECT 
      SUM(CASE WHEN rank <= CEILING(total_count * 0.01) THEN volume_usd ELSE 0 END) as top_1_percent_volume,
      SUM(CASE WHEN rank <= CEILING(total_count * 0.05) THEN volume_usd ELSE 0 END) as top_5_percent_volume
    FROM protocol_data
  ),
  percentile_volumes AS (
    SELECT 
      -- Get volume of user at 99th percentile (top 1% threshold)
      MAX(CASE WHEN rank = CEILING(total_count * 0.01) THEN volume_usd END) as percentile_99_volume,
      -- Get volume of user at 95th percentile (top 5% threshold)  
      MAX(CASE WHEN rank = CEILING(total_count * 0.05) THEN volume_usd END) as percentile_95_volume
    FROM protocol_data
  )
  SELECT 
    vs.total_traders,
    vs.total_volume,
    vs.avg_volume_per_trader,
    tp.top_1_percent_volume,
    tp.top_5_percent_volume,
    pv.percentile_99_volume,
    pv.percentile_95_volume
  FROM volume_stats vs, top_percentiles tp, percentile_volumes pv;
$$;