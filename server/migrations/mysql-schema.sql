-- MySQL Schema for Solana Dashboard
-- Migrated from Supabase (PostgreSQL)

-- Drop tables if they exist (for clean migration)
DROP TABLE IF EXISTS trader_stats_summary;
DROP TABLE IF EXISTS trader_stats;
DROP TABLE IF EXISTS protocol_stats;
DROP TABLE IF EXISTS projected_stats;
DROP TABLE IF EXISTS protocol_sync_status;
DROP TABLE IF EXISTS protocol_configurations;
DROP TABLE IF EXISTS launchpad_stats;

-- protocol_stats (main metrics table)
CREATE TABLE protocol_stats (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  protocol_name VARCHAR(255) DEFAULT '',
  volume_usd DECIMAL(30,6),
  daily_users DECIMAL(20,6),
  new_users DECIMAL(20,6),
  trades DECIMAL(20,6),
  fees_usd DECIMAL(30,6),
  date DATE,
  chain VARCHAR(50) DEFAULT 'solana',
  data_type VARCHAR(20) DEFAULT 'private',
  UNIQUE KEY unique_protocol_date (protocol_name, date, chain, data_type),
  INDEX idx_protocol_name (protocol_name),
  INDEX idx_date (date),
  INDEX idx_chain (chain),
  INDEX idx_data_type (data_type),
  INDEX idx_protocol_date_range (protocol_name, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- projected_stats (projected volume/fees from Dune Analytics)
CREATE TABLE projected_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  protocol_name VARCHAR(255) NOT NULL,
  formatted_day DATE NOT NULL,
  fees_sol DECIMAL(20,6) DEFAULT 0,
  volume_sol DECIMAL(30,6) DEFAULT 0,
  fees_usd DECIMAL(20,6) DEFAULT 0,
  volume_usd DECIMAL(30,6) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_protocol_day (protocol_name, formatted_day),
  INDEX idx_protocol (protocol_name),
  INDEX idx_day (formatted_day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- trader_stats (individual trader statistics)
CREATE TABLE trader_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  protocol_name VARCHAR(50) NOT NULL,
  user_address VARCHAR(255) NOT NULL,
  volume_usd DECIMAL(30,6) DEFAULT 0,
  date DATE NOT NULL,
  chain VARCHAR(20) DEFAULT 'solana',
  UNIQUE KEY unique_trader_date (protocol_name, user_address, date),
  INDEX idx_protocol (protocol_name),
  INDEX idx_volume (volume_usd),
  INDEX idx_date (date),
  INDEX idx_user_address (user_address),
  INDEX idx_protocol_volume (protocol_name, volume_usd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- protocol_sync_status (tracks data sync status)
CREATE TABLE protocol_sync_status (
  protocol_name VARCHAR(255) PRIMARY KEY,
  last_sync_at TIMESTAMP NULL,
  sync_success BOOLEAN DEFAULT FALSE,
  rows_imported INT DEFAULT 0,
  error_message TEXT,
  has_recent_data BOOLEAN DEFAULT FALSE,
  latest_data_date DATE,
  days_behind INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- protocol_configurations (user protocol category preferences)
CREATE TABLE protocol_configurations (
  id CHAR(36) PRIMARY KEY,
  protocol_id VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_protocol (protocol_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- launchpad_stats (launchpad metrics)
CREATE TABLE launchpad_stats (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  launchpad_name VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  launches INT DEFAULT 0,
  graduations INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_launchpad_date (launchpad_name, date),
  INDEX idx_launchpad (launchpad_name),
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- trader_stats_summary (view for trader summary)
CREATE VIEW trader_stats_summary AS
SELECT
  protocol_name,
  COUNT(DISTINCT user_address) as total_traders,
  SUM(volume_usd) as total_volume,
  AVG(volume_usd) as avg_volume,
  MAX(volume_usd) as max_volume,
  MIN(volume_usd) as min_volume
FROM trader_stats
GROUP BY protocol_name;
