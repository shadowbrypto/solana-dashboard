# New Protocol Integration Guide

This guide provides step-by-step instructions for adding a new protocol to the Solana Analytics Dashboard. Follow these steps in order to ensure proper integration across all components.

## Prerequisites

Before adding a new protocol, ensure you have:
- Protocol name and ID
- Dune Analytics query ID(s) for the protocol
- Protocol logo image (JPG format recommended)
- Protocol category (Trading Terminals, Telegram Bots, Mobile Apps, or EVM)
- Chain information (Solana or EVM)
- Data types needed (public, private, or both)

## Step-by-Step Integration Process

### 1. Add Protocol to Type Definitions
**File:** `src/types/protocol.ts`

Add the new protocol ID to the Protocol union type:

```typescript
export type Protocol = "existing" | "protocols" | "new_protocol_id";
```

**Example:**
```typescript
export type Protocol = "axiom" | "bullx" | "photon" | "rhythm";
```

### 2. Create Protocol Icon Component
**File:** `src/components/icons/index.tsx`

Add import for appropriate fallback icon and create new icon component:

```typescript
// Add appropriate import if needed
import { Terminal, Bot, Smartphone } from 'lucide-react';

// Add new icon component
export const NewProtocolIcon = (props: any) => (
  <ProtocolLogo protocolId="new_protocol_id" protocolName="Protocol Name" fallbackIcon={IconComponent} {...props} />
);
```

**Example:**
```typescript
export const RhythmIcon = (props: any) => (
  <ProtocolLogo protocolId="rhythm" protocolName="Rhythm" fallbackIcon={Terminal} {...props} />
);
```

### 3. Update Protocol Configuration
**File:** `src/lib/protocol-config.ts`

#### 3.1 Add Import
Add the new icon to the import statement:

```typescript
import { 
  BonkBotIcon, TrojanIcon, /* other icons */, NewProtocolIcon
} from '../components/icons/index';
```

#### 3.2 Add Protocol Config
Add the protocol to the appropriate category in `protocolConfigs` array:

```typescript
// For Solana Protocols - choose appropriate category:

// Telegram Bots
{ id: 'protocol_id', name: 'Protocol Name', icon: ProtocolIcon, category: 'Telegram Bots', chain: 'solana' },

// Trading Terminals  
{ id: 'protocol_id', name: 'Protocol Name', icon: ProtocolIcon, category: 'Trading Terminals', chain: 'solana' },

// Mobile Apps
{ id: 'protocol_id', name: 'Protocol Name', icon: ProtocolIcon, category: 'Mobile Apps', chain: 'solana' },

// For EVM Protocols
{ id: 'protocol_id_evm', name: 'Protocol Name', icon: ProtocolIcon, category: 'EVM', chain: 'evm' },
```

**Example:**
```typescript
{ id: 'rhythm', name: 'Rhythm', icon: RhythmIcon, category: 'Trading Terminals', chain: 'solana' },
```

### 4. Add Dune Analytics Configuration
**File:** `server/src/services/dataManagementService.ts`

#### 4.1 Add to Public Sources
Add protocol to `PUBLIC_PROTOCOL_SOURCES`:

```typescript
const PUBLIC_PROTOCOL_SOURCES: Record<string, ProtocolSource> = {
  // ... existing protocols
  "protocol_name": { queryIds: [query_id_1, query_id_2], chain: 'solana' }, // or 'evm'
};
```

#### 4.2 Add to Private Sources
Add protocol to `PRIVATE_PROTOCOL_SOURCES`:

```typescript
const PRIVATE_PROTOCOL_SOURCES: Record<string, ProtocolSource> = {
  // ... existing protocols  
  "protocol_name": { queryIds: [query_id_1, query_id_2], chain: 'solana' }, // or 'evm'
};
```

**Example:**
```typescript
// In both PUBLIC_PROTOCOL_SOURCES and PRIVATE_PROTOCOL_SOURCES:
"rhythm": { queryIds: [5698641], chain: 'solana' },
```

**Note:** 
- Use the same query IDs for both public and private if you only have one data source
- Use different query IDs if you have separate public and private data queries
- Support multiple query IDs by adding them to the array: `[query1, query2, query3]`

### 5. Add Protocol Logo (Optional but Recommended)
**File:** `public/assets/logos/protocol_name.jpg`

Add the protocol logo image to the logos directory. The system will automatically map:
- `protocol_id` → `protocol_id.jpg`
- Special naming rules are handled in `getProtocolLogoFilename()` function

### 6. Projected Stats Configuration (If Needed)
**File:** `server/src/config/projected-stats-config.ts`

If the protocol needs projected volume data, add it to the configuration:

```typescript
export const PROJECTED_STATS_CONFIG: Record<string, string> = {
  // ... existing protocols
  protocol_id: 'dune_query_id_for_projected_stats',
};
```

## Automatic Integration

Once the above steps are completed, the protocol will automatically appear in:

### ✅ Navigation
- Sidebar under the appropriate category
- Individual protocol page at `/?protocol=protocol_id`

### ✅ Reports  
- **Daily Report**: `DailyMetricsTable.tsx`
- **Weekly Report**: `WeeklyMetricsTable.tsx` 
- **Monthly Report**: `MonthlyMetricsTable.tsx`
- **EVM Reports**: `EVMDailyMetricsTable.tsx`, `EVMWeeklyMetricsTable.tsx`, `EVMMonthlyMetricsTable.tsx` (for EVM protocols only)

### ✅ Features
- **Trading Apps Comparison**: Available for multi-protocol comparisons
- **Data Sync**: Backend API will fetch data using configured Dune queries
- **Caching**: Automatic integration with caching system
- **Export**: Screenshot and data export functionality

## Data Sync and Testing

### Sync Protocol Data
After adding the protocol configuration, sync data using the API:

```bash
# Sync specific protocol (private data)
curl -X POST http://localhost:3001/api/sync/protocol/protocol_name

# Sync specific protocol (public data)  
curl -X POST http://localhost:3001/api/sync/protocol/protocol_name?dataType=public

# Sync all protocols
curl -X POST http://localhost:3001/api/sync/data
```

### Verify Integration
1. Check sidebar navigation for the new protocol
2. Navigate to `/?protocol=protocol_id` to see individual protocol page
3. Verify protocol appears in reports (Daily, Weekly, Monthly)
4. Test Trading Apps Comparison functionality
5. Check data sync logs for successful data fetching

## Important Notes

### Chain-Specific Considerations
- **Solana Protocols**: Use `chain: 'solana'` and standard integration
- **EVM Protocols**: Use `chain: 'evm'`, add `_evm` suffix to ID, and they appear only in EVM-specific reports

### Naming Conventions
- **Protocol IDs**: Use lowercase, no spaces (e.g., `bullx`, `nova_terminal`)
- **Protocol Names**: Use proper capitalization (e.g., `Bull X`, `Nova Terminal`)  
- **Logo Files**: Match protocol ID exactly (e.g., `bullx.jpg`, `nova.jpg`)

### Category Guidelines
- **Telegram Bots**: Bot-based trading interfaces
- **Trading Terminals**: Web-based trading platforms  
- **Mobile Apps**: Mobile trading applications
- **EVM**: Multi-chain EVM protocols (Ethereum, Base, Arbitrum, etc.)

## Troubleshooting

### Protocol Not Appearing
1. Check TypeScript compilation errors
2. Verify protocol ID matches exactly across all files
3. Ensure icon component is properly imported and exported
4. Check browser console for React errors

### Data Not Loading
1. Verify Dune query IDs are correct and accessible
2. Check API logs for data fetch errors
3. Ensure `DUNE_API_KEY` environment variable is set
4. Test Dune queries directly in Dune Analytics interface

### Logo Not Displaying
1. Verify logo file exists in `public/assets/logos/`
2. Check file naming matches protocol ID
3. Ensure image format is supported (JPG recommended)
4. Check browser network tab for 404 errors

## Example: Complete Rhythm Integration

Here's how the Rhythm protocol was integrated as a reference:

```typescript
// 1. src/types/protocol.ts
export type Protocol = "axiom" | "bullx" | "rhythm" | /* other protocols */;

// 2. src/components/icons/index.tsx
export const RhythmIcon = (props: any) => (
  <ProtocolLogo protocolId="rhythm" protocolName="Rhythm" fallbackIcon={Terminal} {...props} />
);

// 3. src/lib/protocol-config.ts
import { RhythmIcon } from '../components/icons/index';

{ id: 'rhythm', name: 'Rhythm', icon: RhythmIcon, category: 'Trading Terminals', chain: 'solana' },

// 4. server/src/services/dataManagementService.ts
// In both PUBLIC_PROTOCOL_SOURCES and PRIVATE_PROTOCOL_SOURCES:
"rhythm": { queryIds: [5698641], chain: 'solana' },

// 5. Logo: public/assets/logos/rhythm.jpg
```

---

**Always refer to this guide when adding new protocols to ensure consistent integration across all system components.**