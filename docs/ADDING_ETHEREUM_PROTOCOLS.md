# Adding Ethereum Protocols Guide

This guide explains how to add new Ethereum protocols to the analytics dashboard.

## Steps to Add a New Ethereum Protocol

### 1. Backend Configuration

Edit `/server/src/services/dataManagementService.ts` and add your protocol to the `PROTOCOL_SOURCES` object:

```typescript
const PROTOCOL_SOURCES: Record<string, ProtocolSource> = {
  // ... existing Solana protocols ...
  
  // Ethereum protocols
  "uniswap": { queryIds: [123456], chain: 'ethereum' },
  "sushiswap": { queryIds: [789012, 789013], chain: 'ethereum' }, // Multiple queries supported
};
```

**Note**: 
- Replace `123456` with your actual Dune query ID
- You can specify multiple query IDs if you need to aggregate data from multiple queries
- The data from multiple queries will be merged by date

### 2. Frontend Configuration

Edit `/src/lib/protocol-config.ts` and add your protocol configuration:

```typescript
import { ArrowUpRight } from 'lucide-react'; // or use a custom icon

export const protocolConfigs: ProtocolConfig[] = [
  // ... existing protocols ...
  
  // Ethereum protocols
  { 
    id: 'uniswap', 
    name: 'Uniswap', 
    icon: ArrowUpRight, // or custom icon component
    category: 'Trading Terminals', 
    chain: 'ethereum' 
  },
];
```

### 3. Add Protocol Icon (Optional)

If you want to use a custom icon instead of Lucide icons:

1. Create a new icon component in `/src/components/icons/`:
```typescript
// UniswapIcon.tsx
export const UniswapIcon = (props: any) => (
  <ProtocolLogo 
    protocolId="uniswap" 
    protocolName="Uniswap" 
    fallbackIcon={ArrowUpRight} 
    {...props} 
  />
);
```

2. Add the logo image to `/server/public/assets/logos/uniswap.jpg`

3. Export the icon from `/src/components/icons/index.tsx`

### 4. Run Database Migration

Before syncing data, ensure the database has the chain column:

```bash
# Run the migration to add chain column
psql $DATABASE_URL < server/migrations/add_chain_column.sql
```

### 5. Sync Protocol Data

You can now sync data for your new protocol:

```bash
# Sync all protocols (including new Ethereum ones)
curl -X POST http://localhost:3001/api/data-update/sync

# Or sync a specific protocol
curl -X POST http://localhost:3001/api/data-update/sync/uniswap
```

## Dune Query Requirements

Your Dune query should return data with these columns:
- `formattedDay` - Date in DD/MM/YYYY format
- `total_volume_usd` - Total volume in USD
- `daily_users` - Number of daily active users
- `numberOfNewUsers` - Number of new users
- `daily_trades` - Number of daily trades
- `total_fees_usd` - Total fees in USD

Example query structure:
```sql
SELECT 
  TO_CHAR(block_date, 'DD/MM/YYYY') as formattedDay,
  SUM(volume_usd) as total_volume_usd,
  COUNT(DISTINCT user) as daily_users,
  COUNT(DISTINCT CASE WHEN is_new_user THEN user END) as numberOfNewUsers,
  COUNT(*) as daily_trades,
  SUM(fees_usd) as total_fees_usd
FROM your_ethereum_protocol_table
GROUP BY block_date
ORDER BY block_date DESC
```

## Viewing Multi-Chain Data

Once configured, the dashboard will:
- Automatically display Ethereum protocols alongside Solana protocols
- Allow filtering by chain in the UI (coming soon)
- Show chain badges on protocol cards
- Aggregate data correctly for "All Protocols" view

## Troubleshooting

1. **Data not appearing after sync**: Check that your Dune query is returning data in the correct format
2. **Protocol not showing in UI**: Ensure both backend and frontend configurations match (same protocol ID)
3. **Icons not displaying**: Verify the icon component is properly exported and imported