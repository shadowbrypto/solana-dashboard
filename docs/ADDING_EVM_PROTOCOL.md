# Adding EVM Protocols - Complete Guide

This is the comprehensive, step-by-step guide for adding new EVM (Ethereum/Base/Arbitrum/BSC/Avalanche) protocols to the analytics dashboard.

**IMPORTANT**: Follow ALL steps in order. Missing any step will cause the protocol to fail during data sync.

## Prerequisites

- Dune Analytics query ID for the protocol
- Protocol logo image (JPG format recommended)
- Protocol icon/color scheme

## Complete Steps Checklist

### ✅ Step 1: Add Protocol to Data Management Service

**File**: `/server/src/services/dataManagementService.ts`

Add the protocol to BOTH `PUBLIC_PROTOCOL_SOURCES` and `PRIVATE_PROTOCOL_SOURCES`:

```typescript
// Around line 64 - PUBLIC_PROTOCOL_SOURCES
const PUBLIC_PROTOCOL_SOURCES: Record<string, ProtocolSource> = {
  // ... existing protocols ...
  "photon_evm": { queryIds: [5929750], chain: 'evm' },
  "your_protocol_evm": { queryIds: [YOUR_QUERY_ID], chain: 'evm' }  // ADD THIS
};

// Around line 103 - PRIVATE_PROTOCOL_SOURCES
const PRIVATE_PROTOCOL_SOURCES: Record<string, ProtocolSource> = {
  // ... existing protocols ...
  "photon_evm": { queryIds: [5929750], chain: 'evm' },
  "your_protocol_evm": { queryIds: [YOUR_QUERY_ID], chain: 'evm' }  // ADD THIS
};
```

**Why Critical**: This registers the protocol for data syncing. Without this, `syncProtocolData()` will throw: `"Protocol 'your_protocol_evm' not found in protocol sources"`

**Example**:
```typescript
"mevx_evm": { queryIds: [5498756], chain: 'evm' }
```

---

### ✅ Step 2: Add EVM Query Mapping

**File**: `/server/src/services/evmDataMigrationServiceSimple.ts`

Add the protocol to the `getQueryIdForProtocol` method (around line 289):

```typescript
private getQueryIdForProtocol(protocolName: string): number | null {
  const queryMap: Record<string, number> = {
    'sigma_evm': 5430634,
    'maestro_evm': 3832557,
    // ... other protocols ...
    'photon_evm': 5929750,
    'your_protocol_evm': YOUR_QUERY_ID  // ADD THIS
  };
  return queryMap[protocolName] || null;
}
```

**Why Critical**: Maps the protocol name to its Dune query ID for EVM data fetching.

**Example**:
```typescript
'mevx_evm': 5498756
```

---

### ✅ Step 3: Update Chain Configuration

**File**: `/server/src/config/chainProtocols.ts`

If this is a **new protocol** (not existing on Solana), add it:

```typescript
export const chainBasedProtocols: Record<string, ProtocolChainConfig> = {
  // ... existing protocols ...

  // EVM-only protocols
  'sigma': { solana: false, evm: true },
  'your_protocol': { solana: false, evm: true }  // ADD THIS for EVM-only
};
```

If this is a **multi-chain protocol** (exists on both Solana and EVM), update it:

```typescript
// Multi-chain protocols (both Solana and EVM)
'bloom': { solana: true, evm: true },
'banana': { solana: true, evm: true },
'maestro': { solana: true, evm: true },
'your_protocol': { solana: true, evm: true }  // UPDATE THIS
```

**Why Critical**: Defines which chains support this protocol for proper routing.

**Example** (multi-chain):
```typescript
'mevx': { solana: true, evm: true }  // Changed from { solana: true, evm: false }
```

---

### ✅ Step 4: Add Frontend Protocol Configuration

**File**: `/src/lib/protocol-config.ts`

**4a. Add Icon Import** (around line 26):
```typescript
import {
  BonkBotIcon, TrojanIcon, BloomIcon, NovaIcon, SolTradingBotIcon,
  BananaIcon, MaestroIcon, PhotonIcon, BullXIcon, AxiomIcon,
  GMGNAIIcon, MoonshotIcon, VectorIcon, SlingshotIcon, FomoIcon, PadreIcon,
  SigmaIcon, SigmaEVMIcon, MaestroEVMIcon, BloomEVMIcon, BananaEVMIcon, MevxIcon, MevxEVMIcon,
  RhythmIcon, VyperIcon, OpenSeaIcon,
  YourProtocolEVMIcon  // ADD THIS
} from '../components/icons/index';
```

**4b. Add Protocol Entry** (around line 87 in EVM section):
```typescript
export const protocolConfigs: ProtocolConfig[] = [
  // ... Solana protocols ...

  // EVM Protocols (Multi-Chain: Ethereum, Base, Arbitrum, BSC, Avalanche)
  { id: 'sigma_evm', name: 'Sigma', icon: SigmaEVMIcon, category: 'EVM', chain: 'evm' },
  // ... other EVM protocols ...
  { id: 'mevx_evm', name: 'Mevx', icon: MevxEVMIcon, category: 'EVM', chain: 'evm' },
  { id: 'your_protocol_evm', name: 'YourProtocol', icon: YourProtocolEVMIcon, category: 'EVM', chain: 'evm' }  // ADD THIS
];
```

**4c. Add Logo Mapping** (around line 153):
```typescript
export const getProtocolLogoFilename = (protocolId: string): string => {
  // ... existing mappings ...

  switch (protocolId.toLowerCase()) {
    // ... existing cases ...
    case 'mevx_evm':
      return 'mevx.jpg';
    case 'your_protocol_evm':
      return 'yourprotocol.jpg';  // ADD THIS
    default:
      return `${protocolId.toLowerCase()}.jpg`;
  }
};
```

**Why Critical**: Registers the protocol in the frontend navigation and configuration system.

**Example**:
```typescript
{ id: 'mevx_evm', name: 'Mevx', icon: MevxEVMIcon, category: 'EVM', chain: 'evm' }
```

---

### ✅ Step 5: Create Icon Component

**File**: `/src/components/icons/index.tsx`

Add the icon component (around line 99):

```typescript
export const YourProtocolEVMIcon = (props: any) => (
  <ProtocolLogo protocolId="yourprotocol" protocolName="YourProtocol" fallbackIcon={Zap} {...props} />
);
```

**Note**: Use the **base protocol name** without `_evm` suffix in the `protocolId`. This allows EVM protocols to share logos with their Solana counterparts.

**Why Critical**: Provides the icon for UI display.

**Example**:
```typescript
export const MevxEVMIcon = (props: any) => (
  <ProtocolLogo protocolId="mevx" protocolName="Mevx" fallbackIcon={Zap} {...props} />
);
```

---

### ✅ Step 6: Add Color Configuration

**File**: `/src/lib/colors.ts`

Add color for the EVM protocol (around line 32):

```typescript
export const protocolColors: { [key: string]: string } = {
  // ... Solana protocols ...

  // EVM Protocol Colors (distinct from their Solana counterparts)
  sigma: "hsl(300 85% 55%)",
  sigma_evm: "hsl(300 85% 55%)",
  // ... other EVM protocols ...
  mevx_evm: "hsl(195 85% 50%)",
  your_protocol_evm: "hsl(XXX XX% XX%)",  // ADD THIS - choose a unique HSL color
};
```

**Color Guidelines**:
- Use HSL format: `hsl(hue saturation% lightness%)`
- Ensure it's visually distinct from other protocols
- For multi-chain protocols, can match Solana counterpart or use a different shade

**Why Critical**: Provides consistent branding in charts and UI.

**Example**:
```typescript
mevx_evm: "hsl(195 85% 50%)",  // Cyan (matching Solana mevx)
```

---

### ✅ Step 7: Update Cache Management

**File**: `/src/lib/protocol.ts`

Add the protocol to the EVM cache clearing list (around line 75):

```typescript
export function clearEVMProtocolsCaches(): void {
  const evmProtocols = [
    'sigma', 'maestro', 'bloom', 'banana', 'photon', 'padre', 'gmgnai', 'mevx', 'yourprotocol'
  ]; // ADD 'yourprotocol' (without _evm suffix)

  evmProtocols.forEach(protocol => {
    clearProtocolFrontendCache(protocol);
  });

  cacheManager.clearNamespace(CACHE_NAMESPACES.EVM_DATA);
  console.log('Frontend caches cleared for all EVM protocols');
}
```

**Note**: Use the **base protocol name** without `_evm` suffix.

**Why Critical**: Ensures cache is properly cleared when EVM data is updated.

**Example**:
```typescript
const evmProtocols = ['sigma', 'maestro', 'bloom', 'banana', 'photon', 'padre', 'gmgnai', 'mevx'];
```

---

### ✅ Step 8: Add Logo Image (Optional but Recommended)

**File**: `/public/assets/logos/yourprotocol.jpg`

Add the protocol logo image:
- Format: JPG (recommended) or PNG
- Size: Square aspect ratio recommended (e.g., 512x512)
- Name: Lowercase protocol name without `_evm` suffix

**Why Critical**: Provides visual branding. Falls back to icon if missing.

**Example**:
```
/public/assets/logos/mevx.jpg
```

---

## Verification Steps

After completing all steps above:

### 1. Restart Backend Server

```bash
# Kill existing server
pkill -f "node.*server"

# Start backend
cd server
npm start
```

### 2. Test Protocol Sync

```bash
# Sync the new protocol (public data)
curl -X POST http://localhost:3001/api/data-update/sync/your_protocol_evm?dataType=public

# Sync the new protocol (private data)
curl -X POST http://localhost:3001/api/data-update/sync/your_protocol_evm?dataType=private
```

**Expected Response**:
```json
{
  "success": true,
  "csvFilesFetched": 1,
  "rowsImported": XXX,
  "timestamp": "2025-XX-XXTXX:XX:XX.XXXZ",
  ...
}
```

### 3. Verify Database

```bash
# Check data was imported
curl http://localhost:3001/api/protocols/your_protocol_evm/stats?chain=evm
```

### 4. Check Frontend

1. Restart frontend: `npm run dev`
2. Navigate to EVM section in sidebar
3. Verify protocol appears in navigation
4. Click on protocol and verify data loads
5. Check that icon, logo, and colors display correctly

---

## Dune Query Requirements

Your Dune query must return these columns:

| Column | Type | Description |
|--------|------|-------------|
| `formattedDay` | String | Date in `DD/MM/YYYY` format |
| `total_volume_usd` | Number | Total volume in USD |
| `daily_users` | Number | Number of daily active users |
| `numberOfNewUsers` | Number | Number of new users |
| `daily_trades` | Number | Number of daily trades |
| `total_fees_usd` | Number | Total fees in USD |

**Example Query Structure**:
```sql
SELECT
  TO_CHAR(block_date, 'DD/MM/YYYY') as formattedDay,
  SUM(volume_usd) as total_volume_usd,
  COUNT(DISTINCT user_address) as daily_users,
  COUNT(DISTINCT CASE WHEN is_new_user THEN user_address END) as numberOfNewUsers,
  COUNT(*) as daily_trades,
  SUM(fees_usd) as total_fees_usd
FROM your_evm_protocol_table
GROUP BY block_date
ORDER BY block_date DESC
```

---

## Common Errors and Solutions

### Error: "Protocol 'xxx_evm' not found in protocol sources"

**Cause**: Missing Step 1 - Protocol not added to `dataManagementService.ts`

**Solution**: Add protocol to both `PUBLIC_PROTOCOL_SOURCES` and `PRIVATE_PROTOCOL_SOURCES`

---

### Error: "Query ID not found for protocol"

**Cause**: Missing Step 2 - Query mapping not added to `evmDataMigrationServiceSimple.ts`

**Solution**: Add query ID mapping in `getQueryIdForProtocol` method

---

### Protocol doesn't appear in UI

**Cause**: Missing Step 4 - Protocol config not added to frontend

**Solution**: Add protocol entry to `protocolConfigs` array in `protocol-config.ts`

---

### Icon not displaying

**Cause**: Missing Step 5 - Icon component not created or exported

**Solution**:
1. Create icon component in `icons/index.tsx`
2. Import icon in `protocol-config.ts`
3. Verify icon is exported from `icons/index.tsx`

---

### Wrong color in charts

**Cause**: Missing Step 6 - Color not configured

**Solution**: Add color to `protocolColors` in `colors.ts`

---

### Cache not clearing after updates

**Cause**: Missing Step 7 - Protocol not in cache clearing list

**Solution**: Add protocol to `evmProtocols` array in `clearEVMProtocolsCaches()`

---

## Quick Reference - Files to Modify

| File | Location | Line | What to Add |
|------|----------|------|-------------|
| dataManagementService.ts | server/src/services/ | ~64, ~103 | Protocol source config (PUBLIC & PRIVATE) |
| evmDataMigrationServiceSimple.ts | server/src/services/ | ~289 | Query ID mapping |
| chainProtocols.ts | server/src/config/ | ~38 | Chain configuration |
| protocol-config.ts | src/lib/ | ~26, ~87, ~153 | Import, config entry, logo mapping |
| icons/index.tsx | src/components/icons/ | ~99 | Icon component |
| colors.ts | src/lib/ | ~32 | Color definition |
| protocol.ts | src/lib/ | ~75 | Cache clearing list |
| yourprotocol.jpg | public/assets/logos/ | - | Logo image |

---

## Example: Adding Mevx EVM

Here's a complete real example of adding Mevx as an EVM protocol:

**Step 1** - dataManagementService.ts:
```typescript
"mevx_evm": { queryIds: [5498756], chain: 'evm' }
```

**Step 2** - evmDataMigrationServiceSimple.ts:
```typescript
'mevx_evm': 5498756
```

**Step 3** - chainProtocols.ts:
```typescript
'mevx': { solana: true, evm: true }
```

**Step 4** - protocol-config.ts:
```typescript
// Import
import { ..., MevxIcon, MevxEVMIcon, ... } from '../components/icons/index';

// Config
{ id: 'mevx_evm', name: 'Mevx', icon: MevxEVMIcon, category: 'EVM', chain: 'evm' }

// Logo mapping
case 'mevx_evm':
  return 'mevx.jpg';
```

**Step 5** - icons/index.tsx:
```typescript
export const MevxEVMIcon = (props: any) => (
  <ProtocolLogo protocolId="mevx" protocolName="Mevx" fallbackIcon={Zap} {...props} />
);
```

**Step 6** - colors.ts:
```typescript
mevx_evm: "hsl(195 85% 50%)",
```

**Step 7** - protocol.ts:
```typescript
const evmProtocols = ['sigma', 'maestro', 'bloom', 'banana', 'photon', 'padre', 'gmgnai', 'mevx'];
```

**Step 8** - Add logo:
```
public/assets/logos/mevx.jpg
```

---

## Troubleshooting Checklist

Before asking for help, verify:

- [ ] Added to PUBLIC_PROTOCOL_SOURCES in dataManagementService.ts
- [ ] Added to PRIVATE_PROTOCOL_SOURCES in dataManagementService.ts
- [ ] Added query mapping in evmDataMigrationServiceSimple.ts
- [ ] Updated chainProtocols.ts
- [ ] Added protocol config in protocol-config.ts (import, entry, logo mapping)
- [ ] Created icon component in icons/index.tsx
- [ ] Added color in colors.ts
- [ ] Added to cache clearing list in protocol.ts
- [ ] Restarted backend server
- [ ] Tested sync endpoint
- [ ] Verified data in database
- [ ] Checked frontend displays correctly

---

## Notes

- **Protocol Naming**: Always use `protocolname_evm` format for EVM protocols
- **Query IDs**: Use your actual Dune Analytics query ID
- **Multi-chain**: For protocols on both Solana and EVM, update `chainProtocols.ts` instead of adding new entry
- **Logo Sharing**: EVM protocols can share logos with Solana counterparts by using base protocol name
- **Testing**: Always test with both `public` and `private` data types

---

Last Updated: October 17, 2025
