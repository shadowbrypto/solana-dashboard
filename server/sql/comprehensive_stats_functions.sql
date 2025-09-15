-- Optimized SQL functions for fast trader stats calculations
-- These functions calculate key metrics directly in the database for maximum performance

-- 1. Get comprehensive stats for a protocol (all key metrics in one query)
CREATE OR REPLACE FUNCTION get_comprehensive_protocol_stats(protocol_name_param text)
RETURNS TABLE(
  total_traders integer,
  total_volume numeric,
  avg_volume_per_trader numeric,
  top_1_percent_volume numeric,
  top_5_percent_volume numeric,
  percentile_99_volume numeric,
  percentile_95_volume numeric,
  top_1_percent_share numeric,
  top_5_percent_share numeric
) AS $$
BEGIN
  -- Single query to calculate all metrics efficiently
  RETURN QUERY
  WITH base_stats AS (
    SELECT 
      COUNT(*)::integer as total_count,
      COALESCE(SUM(volume_usd), 0) as total_vol
    FROM trader_stats 
    WHERE trader_stats.protocol_name = protocol_name_param
  ),
  percentile_counts AS (
    SELECT 
      total_count,
      total_vol,
      GREATEST(1, FLOOR(total_count * 0.01)::integer) as top_1_count,
      GREATEST(1, FLOOR(total_count * 0.05)::integer) as top_5_count
    FROM base_stats
  ),
  ranked_traders AS (
    SELECT 
      volume_usd,
      ROW_NUMBER() OVER (ORDER BY volume_usd DESC) as rank
    FROM trader_stats 
    WHERE trader_stats.protocol_name = protocol_name_param
  ),
  percentile_volumes AS (
    SELECT
      pc.total_count,
      pc.total_vol,
      COALESCE(SUM(CASE WHEN rt.rank <= pc.top_1_count THEN rt.volume_usd ELSE 0 END), 0) as top_1_vol,
      COALESCE(SUM(CASE WHEN rt.rank <= pc.top_5_count THEN rt.volume_usd ELSE 0 END), 0) as top_5_vol,
      COALESCE(MAX(CASE WHEN rt.rank = pc.top_1_count THEN rt.volume_usd END), 0) as p99_vol,
      COALESCE(MAX(CASE WHEN rt.rank = pc.top_5_count THEN rt.volume_usd END), 0) as p95_vol
    FROM percentile_counts pc
    LEFT JOIN ranked_traders rt ON rt.rank <= pc.top_5_count
    GROUP BY pc.total_count, pc.total_vol
  )
  SELECT 
    pv.total_count,
    pv.total_vol,
    CASE WHEN pv.total_count > 0 THEN pv.total_vol / pv.total_count ELSE 0 END,
    pv.top_1_vol,
    pv.top_5_vol,
    pv.p99_vol,
    pv.p95_vol,
    CASE WHEN pv.total_vol > 0 THEN (pv.top_1_vol / pv.total_vol) * 100 ELSE 0 END,
    CASE WHEN pv.total_vol > 0 THEN (pv.top_5_vol / pv.total_vol) * 100 ELSE 0 END
  FROM percentile_volumes pv;
END;
$$ LANGUAGE plpgsql;

-- 2. Get fast percentile brackets for a protocol
CREATE OR REPLACE FUNCTION get_protocol_percentile_brackets(protocol_name_param text)
RETURNS TABLE(
  percentile integer,
  trader_count integer,
  rank_range text,
  volume numeric,
  volume_share numeric
) AS $$
BEGIN
  -- Calculate percentile brackets efficiently in a single query
  RETURN QUERY
  WITH base_stats AS (
    SELECT 
      COUNT(*)::integer as total_count,
      COALESCE(SUM(volume_usd), 0) as total_vol
    FROM trader_stats 
    WHERE trader_stats.protocol_name = protocol_name_param
  ),
  percentiles AS (
    SELECT unnest(ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 50, 75, 100]) as pct
  ),
  ranked_traders AS (
    SELECT 
      volume_usd,
      ROW_NUMBER() OVER (ORDER BY volume_usd DESC) as rank
    FROM trader_stats 
    WHERE trader_stats.protocol_name = protocol_name_param
  ),
  bracket_calculations AS (
    SELECT 
      p.pct,
      bs.total_vol,
      GREATEST(1, FLOOR(bs.total_count * p.pct / 100.0)::integer) as cutoff_rank,
      COALESCE(SUM(rt.volume_usd), 0) as bracket_volume
    FROM percentiles p
    CROSS JOIN base_stats bs
    LEFT JOIN ranked_traders rt ON rt.rank <= GREATEST(1, FLOOR(bs.total_count * p.pct / 100.0)::integer)
    WHERE bs.total_count > 0
    GROUP BY p.pct, bs.total_count, bs.total_vol
  )
  SELECT 
    bc.pct,
    bc.cutoff_rank,
    CASE 
      WHEN bc.cutoff_rank > 0 THEN '1-' || bc.cutoff_rank::text 
      ELSE '0' 
    END,
    bc.bracket_volume,
    CASE 
      WHEN bc.total_vol > 0 THEN (bc.bracket_volume / bc.total_vol) * 100 
      ELSE 0 
    END
  FROM bracket_calculations bc
  ORDER BY bc.pct;
END;
$$ LANGUAGE plpgsql;

-- 3. Get fast total volume calculation (already exists but let's optimize it)
CREATE OR REPLACE FUNCTION calculate_protocol_total_volume(protocol_name text)
RETURNS numeric AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(volume_usd), 0)
    FROM trader_stats 
    WHERE trader_stats.protocol_name = protocol_name
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Get trader count (fast count)
CREATE OR REPLACE FUNCTION get_protocol_trader_count(protocol_name text)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM trader_stats 
    WHERE trader_stats.protocol_name = protocol_name
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Get top N traders efficiently with volume share pre-calculated
CREATE OR REPLACE FUNCTION get_top_traders_with_stats(
  protocol_name_param text, 
  page_num integer DEFAULT 1, 
  page_size integer DEFAULT 100
)
RETURNS TABLE(
  protocol_name text,
  user_address text,
  volume_usd numeric,
  date text,
  chain text,
  rank integer,
  volume_share numeric
) AS $$
BEGIN
  -- Return paginated results with pre-calculated stats in a single query
  RETURN QUERY
  WITH total_volume AS (
    SELECT COALESCE(SUM(volume_usd), 0) as total_vol
    FROM trader_stats 
    WHERE trader_stats.protocol_name = protocol_name_param
  ),
  ranked_data AS (
    SELECT 
      ts.protocol_name,
      ts.user_address,
      ts.volume_usd,
      ts.date,
      ts.chain,
      ROW_NUMBER() OVER (ORDER BY ts.volume_usd DESC) as trader_rank
    FROM trader_stats ts
    WHERE ts.protocol_name = protocol_name_param
  ),
  paginated_data AS (
    SELECT *
    FROM ranked_data
    ORDER BY trader_rank
    LIMIT page_size OFFSET (page_num - 1) * page_size
  )
  SELECT 
    pd.protocol_name,
    pd.user_address,
    pd.volume_usd,
    pd.date,
    pd.chain,
    pd.trader_rank::integer,
    CASE 
      WHEN tv.total_vol > 0 THEN (pd.volume_usd / tv.total_vol) * 100 
      ELSE 0 
    END
  FROM paginated_data pd
  CROSS JOIN total_volume tv;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_trader_stats_protocol_volume 
ON trader_stats (protocol_name, volume_usd DESC);

CREATE INDEX IF NOT EXISTS idx_trader_stats_protocol_only 
ON trader_stats (protocol_name);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_comprehensive_protocol_stats(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_protocol_percentile_brackets(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION calculate_protocol_total_volume(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_protocol_trader_count(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_top_traders_with_stats(text, integer, integer) TO PUBLIC;