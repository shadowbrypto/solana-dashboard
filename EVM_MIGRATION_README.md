# EVM Data Migration Guide

This guide explains how to migrate EVM (Ethereum Virtual Machine) compatible chain data from Dune Analytics into the Sol Analytics database.

## Overview

The EVM migration system supports importing volume data from multiple EVM-compatible chains including:
- Ethereum
- Base
- Arbitrum
- BSC (Binance Smart Chain)
- Avalanche
- And other EVM-compatible networks

## Key Features

### 🔄 Multi-Chain Support
- Automatically splits data by blockchain network
- Stores data with proper chain identification
- Supports volume-only data structure (different from Solana data)

### 📊 Volume-Focused Migration
- Optimized for volume data import
- Sets default values for missing metrics (users, trades, fees)
- Handles different CSV column formats from EVM data

### 🏗️ Database Structure
- Uses the same `protocol_metrics` table as Solana data
- Adds `chain` column to distinguish between networks
- Maintains compatibility with existing dashboard components

## Setup

### 1. Database Migration
First, run the database migration to add chain support:

```bash
cd server
npm run migrate-db add_chain_support.sql
```

### 2. Configure EVM Protocols
The EVM protocols are configured in `server/src/services/evmDataMigrationService.ts`:

```typescript
const EVM_PROTOCOL_SOURCES: Record<string, EVMProtocolSource> = {
  "sigma_evm": { 
    queryIds: [5430634], 
    chains: ['ethereum', 'base', 'arbitrum', 'bsc', 'avax'] 
  },
  "maestro_evm": { 
    queryIds: [3832557], 
    chains: ['ethereum', 'base', 'arbitrum', 'bsc', 'avax'] 
  },
  "bloom_evm": { 
    queryIds: [4824799], 
    chains: ['ethereum', 'base', 'arbitrum', 'bsc', 'avax'] 
  },
  "banana_evm": { 
    queryIds: [4750709], 
    chains: ['ethereum', 'base', 'arbitrum', 'bsc', 'avax'] 
  }
};
```

### 3. Environment Variables
Ensure your `.env` file contains the Dune API key:

```env
DUNE_API_KEY=your_dune_api_key_here
```

## Usage

### Sync All EVM Protocols
```bash
cd server
npm run sync-evm
```

### Sync Specific EVM Protocol
```bash
cd server
npm run sync-evm sigma_evm
```

### API Endpoints
You can also trigger syncing via API:

```bash
# Sync all EVM protocols
curl -X POST http://localhost:3001/api/protocols/sync-evm

# Sync specific protocol
curl -X POST http://localhost:3001/api/protocols/sync-evm/sigma_evm
```

## Data Flow

### 1. Download Phase
- Downloads CSV data from Dune Analytics using query IDs
- Handles multiple queries per protocol
- Processes and validates CSV content

### 2. Chain Processing Phase
- Automatically detects chain information from CSV data
- Normalizes chain names (eth → ethereum, arb → arbitrum, etc.)
- Splits data by blockchain network

### 3. Import Phase
- Creates separate database entries for each chain
- Maps CSV columns to database columns
- Sets default values for missing metrics
- Handles date format conversion

### 4. Storage Structure
Each row in the database includes:
```sql
protocol_name: 'sigma_evm'
chain: 'ethereum'  -- or 'base', 'arbitrum', etc.
date: '2024-12-07'
volume_usd: 1234567.89
daily_users: 0      -- Default for EVM volume-only data
new_users: 0        -- Default for EVM volume-only data
trades: 0           -- Default for EVM volume-only data
fees_usd: 0         -- Default for EVM volume-only data
```

## Expected CSV Format

The EVM migration expects CSV files with volume data. Common column names include:
- `date` or `day` or `formattedDay` - Date information
- `volume_usd` or `total_volume_usd` or `volume` - Volume in USD
- `chain` or `blockchain` or `network` - Chain identifier (optional)

Example CSV structure:
```csv
date,chain,volume_usd
2024-12-07,ethereum,1234567.89
2024-12-07,base,987654.32
2024-12-06,arbitrum,555666.77
```

## Monitoring

### Sync Status
The system tracks sync status for each protocol:
- Success/failure status
- Row counts imported
- Error messages if any
- Last sync timestamp

### Logs
Monitor the console output during sync for:
- Download progress
- Chain processing results
- Import statistics
- Error details

## Troubleshooting

### Common Issues

1. **Empty CSV Data**
   - Check if the Dune query ID is correct
   - Verify the query returns data in Dune Analytics dashboard
   - Ensure API key has proper permissions

2. **Chain Recognition**
   - Check if chain names in CSV match expected formats
   - Update `normalizeChainName()` function if needed
   - Verify chain list in protocol configuration

3. **Date Format Issues**
   - The system handles multiple date formats automatically
   - Check console logs for date parsing warnings
   - Ensure dates are in recognizable format (YYYY-MM-DD or DD/MM/YYYY)

4. **Database Errors**
   - Run the chain support migration first
   - Check database permissions
   - Verify Supabase connection settings

### Debug Mode
Enable detailed logging by checking the console output during sync operations.

## Integration with Dashboard

The migrated EVM data integrates seamlessly with the existing dashboard:
- Chain filter capabilities in protocol views
- Multi-chain volume aggregation
- Protocol comparison across different networks
- Unified metric display with chain indicators

## File Structure

```
server/
├── migrations/
│   └── add_chain_support.sql           # Database migration
├── scripts/
│   ├── sync-evm-data.ts               # CLI sync script
│   └── run-migrations.ts              # Migration runner
├── src/services/
│   └── evmDataMigrationService.ts     # Main EVM migration service
└── data/evm/                          # Downloaded CSV files (auto-created)
    ├── sigma_evm_ethereum.csv
    ├── sigma_evm_base.csv
    └── ...
```

## Next Steps

1. **Add More Protocols**: Update `EVM_PROTOCOL_SOURCES` with additional protocol query IDs
2. **Chain Support**: Add support for more EVM-compatible chains as needed
3. **Enhanced Metrics**: Extend to support additional metrics beyond volume if available
4. **Scheduling**: Set up automated sync schedules for regular data updates
5. **Dashboard Enhancement**: Add chain-specific filtering and visualization features