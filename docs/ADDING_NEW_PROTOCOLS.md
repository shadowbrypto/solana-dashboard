# Adding New Protocols to Sol Analytics Dashboard

This guide explains how to add new protocols to the Sol Analytics Dashboard.

## ⚠️ CRITICAL Configuration Files

To avoid "Protocol not found in protocol sources" errors, you MUST add the protocol to ALL of these backend config files:

1. **`server/src/config/rolling-refresh-config.ts`** - REQUIRED for data refresh
2. **`server/src/config/chainProtocols.ts`** - REQUIRED for chain routing
3. **`server/src/services/dataManagementService.ts`** - REQUIRED for data fetching (PUBLIC and PRIVATE)
4. **`server/src/config/fee-config.ts`** - Recommended for fee calculations
5. **`server/src/config/projected-stats-config.ts`** - Optional for projected volume

## Quick Steps

### 1. Backend Configuration

#### A. Add to Rolling Refresh Config (CRITICAL)
Add to `/server/src/config/rolling-refresh-config.ts`:

```typescript
export const ROLLING_REFRESH_SOURCES: Record<string, RollingRefreshSource> = {
  // ... existing protocols
  'your-protocol-name': { queryIds: [YOUR_DUNE_QUERY_ID], chain: 'solana' },
};
```

#### B. Add to Chain Protocols Config (CRITICAL)
Add to `/server/src/config/chainProtocols.ts`:

```typescript
export const chainBasedProtocols: Record<string, ProtocolChainConfig> = {
  // ... existing protocols
  'your-protocol-name': { solana: true, evm: false },
};
```

#### C. Add to Data Management Service
Add to `/server/src/services/dataManagementService.ts`:

```typescript
const PUBLIC_PROTOCOL_SOURCES: Record<string, ProtocolSource> = {
  // ... existing protocols
  "your-protocol-name": { queryIds: [YOUR_DUNE_QUERY_ID], chain: 'solana' },
};

const PRIVATE_PROTOCOL_SOURCES: Record<string, ProtocolSource> = {
  // ... existing protocols
  "your-protocol-name": { queryIds: [YOUR_DUNE_QUERY_ID], chain: 'solana' },
};
```

#### D. Add to Fee Config (Recommended)
Add to `/server/src/config/fee-config.ts`:

```typescript
export const PROTOCOL_FEES: ProtocolFeeConfig = {
  // ... existing protocols
  'your-protocol-name': '1.0%',
};
```

### 2. Frontend Configuration

Add the protocol to `/src/lib/protocol-config.ts`:

```typescript
export const protocolConfigs: ProtocolConfig[] = [
  // ... existing protocols
  { 
    id: 'your-protocol-name', 
    name: 'Your Protocol Display Name', 
    icon: YourIconName, // Import from lucide-react
    category: 'Telegram Bots' // or 'Trading Terminals' or 'Mobile Apps'
  },
];
```

### 3. Choose an Icon

Browse available icons at [lucide.dev/icons](https://lucide.dev/icons) and import it at the top of the file:

```typescript
import { YourIconName } from 'lucide-react';
```

### 4. Projected Stats Configuration (Optional - If Using Projected Volume)

**⚠️ IMPORTANT**: To show projected volume data ("Adj. Volume" column), you MUST configure in BOTH backend AND frontend:

#### Backend Projected Stats
Add to `/server/src/config/projected-stats-config.ts`:

```typescript
export const DUNE_QUERY_IDS: Record<string, string> = {
  // ... existing protocols
  'your-protocol-name': 'YOUR_PROJECTED_STATS_DUNE_QUERY_ID',
};
```

#### Frontend Projected Stats
Add to `/src/lib/projected-stats-config.ts`:

```typescript
export const DUNE_QUERY_IDS: DuneQueryConfig = {
  // ... existing protocols
  'your-protocol-name': 'YOUR_PROJECTED_STATS_DUNE_QUERY_ID', // MUST match backend
};
```

**⚠️ CRITICAL: THREE Locations to Update**:
1. Backend config: `server/src/config/projected-stats-config.ts`
2. Frontend config: `src/lib/projected-stats-config.ts`
3. **Settings UI**: `src/components/ProtocolManagement.tsx` - Add to category array

**Synchronization Requirements**:
- Both configs MUST have IDENTICAL query IDs
- Update ALL THREE files at the same time
- Use empty string `''` (not placeholder) if protocol has no projected stats
- Add protocol to correct category array in ProtocolManagement.tsx
- Settings page will only show protocols that are in the component's hardcoded array

### 5. Sync Data

Run the data sync to fetch CSV files and update the database:

```bash
curl -X POST http://localhost:3001/api/data-update/sync
```

Or use the "Sync Data" button in the UI.

**For projected stats data**, also run:

```bash
curl -X POST http://localhost:3001/api/projected-stats/update
```

## Protocol Categories

Protocols are organized into three categories:

- **Telegram Bots**: Trading bots that operate through Telegram
- **Trading Terminals**: Web-based trading interfaces  
- **Mobile Apps**: Mobile trading applications

## Protocol Management UI

Visit `/admin/protocols` in the application to:
- View all configured protocols
- See which category each protocol belongs to
- Get instructions for adding new protocols
- Copy configuration templates

## Example: Adding "NewBot" Protocol

1. **Backend**: Add to dataManagementService.ts
```typescript
"newbot": 5234567,
```

2. **Frontend**: Add to protocol-config.ts
```typescript
import { Bot } from 'lucide-react';

// In protocolConfigs array:
{ 
  id: 'newbot', 
  name: 'NewBot', 
  icon: Bot,
  category: 'Telegram Bots'
},
```

3. **Sync**: Run data sync command
4. **Verify**: Check the dashboard to see the new protocol

## Troubleshooting

- **Protocol not showing**: Ensure the ID matches exactly between backend and frontend
- **No data**: Check if the Dune query ID is correct and has data
- **Icon not found**: Make sure to import the icon from lucide-react
- **Category issues**: Use one of the three defined categories exactly

## Best Practices

1. Use lowercase for protocol IDs (e.g., 'bonkbot', not 'BonkBot')
2. Use proper capitalization for display names
3. Choose icons that represent the protocol's function
4. Group similar protocols in the same category
5. Test data sync after adding new protocols