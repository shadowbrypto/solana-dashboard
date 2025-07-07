# EVM Migration Setup Instructions

## Quick Start Guide

### 1. Set Up Environment
First, make sure you have your Dune API key:

```bash
# Create .env file in the server directory
cd server
echo "DUNE_API_KEY=your_dune_api_key_here" > .env
```

Get your Dune API key from: https://dune.com/settings/api

### 2. Analyze Your CSV Structure
Before running the migration, analyze your EVM query CSV files to understand their structure:

```bash
cd server
npm run analyze-evm
```

This will:
- Download sample data from your 4 EVM query IDs
- Show you the exact column names and structure
- Help you understand what data is available

### 3. Update Column Mapping (if needed)
Based on the analysis results, you may need to update the column mapping in:
`server/src/services/evmDataMigrationService.ts`

Look for the `EVM_COLUMN_MAP` section and adjust the mappings to match your actual CSV columns.

### 4. Run Database Migration
Add support for multiple chains in your database:

```bash
cd server
npm run migrate-db add_chain_support.sql
```

### 5. Run EVM Data Migration
Sync your EVM protocol data:

```bash
# Sync all EVM protocols
cd server
npm run sync-evm

# Or sync specific protocol
npm run sync-evm sigma_evm
```

## Your Current EVM Protocols

The system is configured for these protocols:

1. **sigma_evm** (Query ID: 5430634)
2. **maestro_evm** (Query ID: 3832557)
3. **bloom_evm** (Query ID: 4824799) 
4. **banana_evm** (Query ID: 4750709)

Each protocol supports these EVM chains:
- Ethereum
- Base
- Arbitrum
- BSC (Binance Smart Chain)
- Avalanche

## What Happens During Migration

### Data Download
- Downloads CSV data from each Dune query
- Analyzes column structure automatically
- Logs progress and any issues

### Chain Processing
- Detects if data contains chain information
- Splits data by blockchain network
- Handles cases where no chain info is present

### Data Mapping
- Maps CSV columns to database fields
- Handles multiple date formats automatically
- Parses numeric values safely
- Sets defaults for missing metrics

### Database Import
- Creates separate entries for each chain
- Uses upsert to handle duplicates
- Tracks sync status and errors

## Expected Data Structure

After migration, your database will contain entries like:

```sql
protocol_name: 'sigma_evm'
chain: 'ethereum'
date: '2024-12-07'
volume_usd: 1234567.89
daily_users: 0      -- Default for volume-only data
new_users: 0        -- Default for volume-only data
trades: 0           -- Default for volume-only data  
fees_usd: 0         -- Default for volume-only data
```

## Common CSV Formats Supported

The migration handles these column variations:

**Date columns:**
- `date`, `day`, `time`, `timestamp`
- `block_date`, `tx_date`, `formattedDay`

**Volume columns:**
- `volume_usd`, `total_volume_usd`, `volume`
- `usd_volume`, `volume_in_usd`

**Chain columns:**
- `chain`, `blockchain`, `network`

**Optional metrics (if available):**
- Users: `users`, `daily_users`, `traders`
- Trades: `trades`, `transactions`, `tx_count`
- Fees: `fees`, `fees_usd`, `gas_fees`

## Troubleshooting

### 1. API Key Issues
```bash
❌ DUNE_API_KEY environment variable is not set
```
**Solution:** Create `.env` file with your Dune API key

### 2. Empty Data
```bash
⚠️ No valid EVM data found for protocol_name on chain
```
**Solution:** 
- Check if your Dune query returns data
- Verify query ID is correct
- Run `npm run analyze-evm` to see actual data structure

### 3. Column Mapping Issues
```bash
⚠️ Unknown columns found: custom_column_name
```
**Solution:** Update `EVM_COLUMN_MAP` in the migration service

### 4. Date Parsing Errors
```bash
⚠️ Failed to parse date: invalid_date_format
```
**Solution:** Check the `parseDate` method and add support for your date format

### 5. Chain Recognition
```bash
⚠️ Unknown chain: custom_chain_name
```
**Solution:** Update `normalizeChainName` method to handle your chain names

## API Endpoints

You can also trigger migrations via API:

```bash
# Sync all EVM protocols
curl -X POST http://localhost:3001/api/protocols/sync-evm

# Sync specific protocol  
curl -X POST http://localhost:3001/api/protocols/sync-evm/sigma_evm
```

## Next Steps

1. **Run the analysis:** `npm run analyze-evm`
2. **Check the output** and update column mappings if needed
3. **Run migration:** `npm run migrate-db add_chain_support.sql`
4. **Sync data:** `npm run sync-evm`
5. **Verify results** in your dashboard

## Advanced Configuration

### Adding More Protocols
Edit `EVM_PROTOCOL_SOURCES` in `evmDataMigrationService.ts`:

```typescript
"new_protocol_evm": { 
  queryIds: [your_query_id], 
  chains: ['ethereum', 'base', 'arbitrum'] 
}
```

### Supporting More Chains
Add to the chains array and update `normalizeChainName()`:

```typescript
chains: ['ethereum', 'base', 'arbitrum', 'bsc', 'avax', 'polygon']
```

### Custom Column Mapping
Update `EVM_COLUMN_MAP` with your specific column names:

```typescript
"your_custom_volume_column": "volume_usd",
"your_custom_date_column": "date"
```

The migration system is designed to be flexible and handle various EVM data formats. Start with the analysis step to understand your data structure! 🚀