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

## Complete Configuration Checklist

To avoid "Protocol not found" errors and ensure full integration, you MUST configure the protocol in ALL of these locations:

### Frontend Files (5 files)
- [ ] `src/types/protocol.ts` - Add to Protocol union type
- [ ] `src/components/icons/index.tsx` - Create icon component
- [ ] `src/lib/protocol-config.ts` - Add protocol configuration
- [ ] `public/assets/logos/{protocol_id}.jpg` - Add logo image (optional)

### Backend Configuration Files (6 files)
- [ ] `server/src/services/dataManagementService.ts` - Add to PUBLIC_PROTOCOL_SOURCES
- [ ] `server/src/services/dataManagementService.ts` - Add to PRIVATE_PROTOCOL_SOURCES
- [ ] `server/src/config/rolling-refresh-config.ts` - **CRITICAL** - Add rolling refresh query
- [ ] `server/src/config/chainProtocols.ts` - **CRITICAL** - Define chain support
- [ ] `server/src/config/fee-config.ts` - Add trading fee (recommended)
- [ ] `server/src/config/projected-stats-config.ts` - Add projected stats query (optional)

### Frontend Projected Stats (if using projected volume)
- [ ] `src/lib/projected-stats-config.ts` - Add projected stats query (must match backend)
- [ ] `src/components/ProtocolManagement.tsx` - Add to category's hardcoded protocol array

**Missing any of the CRITICAL files will cause data refresh failures!**

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

### 6. Rolling Refresh Configuration (CRITICAL - Required for Data Refresh)
**File:** `server/src/config/rolling-refresh-config.ts`

**⚠️ IMPORTANT**: This configuration is REQUIRED for data refresh operations to work. Without this, you will get "Protocol not found in protocol sources" errors when trying to refresh data.

Add the protocol with its 7-day rolling refresh Dune query ID:

```typescript
export const ROLLING_REFRESH_SOURCES: Record<string, RollingRefreshSource> = {
  // ... existing protocols
  'protocol_id': { queryIds: [dune_query_id_for_7_day_data], chain: 'solana' }, // or 'evm'
};
```

**Example:**
```typescript
'phantom': { queryIds: [6229269], chain: 'solana' },
```

### 7. Chain Protocols Configuration (CRITICAL - Required for Chain Routing)
**File:** `server/src/config/chainProtocols.ts`

**⚠️ IMPORTANT**: This configuration defines which blockchains support the protocol. Required for proper data routing and protocol categorization.

Add the protocol with chain support flags:

```typescript
export const chainBasedProtocols: Record<string, ProtocolChainConfig> = {
  // ... existing protocols
  'protocol_id': { solana: true, evm: false }, // Set to true for supported chains
};
```

**Example:**
```typescript
'phantom': { solana: true, evm: false },
```

### 8. Fee Configuration (Recommended)
**File:** `server/src/config/fee-config.ts`

Add the protocol's trading fee for fee calculations and comparisons:

```typescript
export const PROTOCOL_FEES: ProtocolFeeConfig = {
  // ... existing protocols
  'protocol_id': '1.0%', // Replace with actual fee percentage
};
```

**Example:**
```typescript
'phantom': '1.0%',
```

### 9. Projected Stats Configuration (Optional - Dual Configuration Required)

**⚠️ IMPORTANT**: Projected stats requires configuration in BOTH backend AND frontend files for data to display correctly.

#### A. Backend Projected Stats Config
**File:** `server/src/config/projected-stats-config.ts`

Add the protocol's projected volume Dune query ID:

```typescript
export const DUNE_QUERY_IDS: Record<string, string> = {
  // ... existing protocols
  'protocol_id': 'dune_query_id_for_projected_stats',
};
```

**Example:**
```typescript
'phantom': '6229270',
```

#### B. Frontend Projected Stats Config
**File:** `src/lib/projected-stats-config.ts`

**CRITICAL**: Also add the same query ID to the frontend config:

```typescript
export const DUNE_QUERY_IDS: DuneQueryConfig = {
  // ... existing protocols
  'protocol_id': 'dune_query_id_for_projected_stats',
};
```

**Example:**
```typescript
'phantom': '6229270',
```

#### C. Protocol Management Component (CRITICAL for Settings Page)
**File:** `src/components/ProtocolManagement.tsx`

**CRITICAL**: Add protocol to the hardcoded array in the appropriate category section for it to appear in Settings > Projected Stats Management page.

Find the category section (Telegram Bots, Trading Terminals, or Mobile Apps) and add protocol ID to the array:

**For Trading Terminals** (around line 1163):
```typescript
{['photon', 'bullx', 'axiom', 'gmgnai', 'padre', 'nova terminal', 'telemetry', 'mevx', 'rhythm', 'vyper', 'phantom'].map(protocolId => {
```

**For Telegram Bots** (around line 1093):
```typescript
{['trojanonsolana', 'bonkbot', 'bloom', 'soltradingbot', 'banana', 'maestro'].map(protocolId => {
```

**Example:**
```typescript
// Trading Terminals section - add 'phantom' to end of array
{['photon', 'bullx', /* ... */, 'vyper', 'phantom'].map(protocolId => {
```

**Why All Three Are Needed**:
- Backend config: Defines which Dune query to fetch data from
- Frontend config: Validates and enables display of projected stats in UI
- ProtocolManagement component: Makes protocol appear in Settings page
- **CRITICAL**: All three locations MUST be updated for full functionality
- Missing any will cause: Settings page won't show protocol, or data won't display, or refresh won't work

**Configuration Synchronization**:
⚠️ **IMPORTANT**: The frontend and backend configs MUST be kept in sync manually:
1. When adding a protocol, add the SAME Dune query ID to BOTH files
2. When updating a query ID, update it in BOTH files
3. Use empty string `''` (not placeholder text) for protocols without projected stats
4. Verify both configs match before committing changes

**Data Flow**:
1. Backend fetches data from Dune using backend config
2. Data is stored in Supabase `projected_stats` table
3. Frontend fetches data via `/api/protocols/daily-metrics` endpoint
4. Frontend validates using frontend config before displaying
5. Settings page uses frontend config to show available protocols
6. Displayed as "Adj. Volume" column in Daily Metrics table

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

### Data Refresh Fails: "Protocol not found in protocol sources"
**Error Message**: `Protocol 'protocol_name' not found in protocol sources for data type 'private'`

**Root Cause**: Missing configuration in one or more critical backend config files.

**Solution - Check ALL of these files**:

1. **`server/src/config/rolling-refresh-config.ts`** (MOST COMMON ISSUE)
   - Verify protocol is added to `ROLLING_REFRESH_SOURCES`
   - Format: `'protocol_id': { queryIds: [query_id], chain: 'solana' }`

2. **`server/src/config/chainProtocols.ts`**
   - Verify protocol is added to `chainBasedProtocols`
   - Format: `'protocol_id': { solana: true, evm: false }`

3. **`server/src/services/dataManagementService.ts`**
   - Verify protocol is in both `PUBLIC_PROTOCOL_SOURCES` and `PRIVATE_PROTOCOL_SOURCES`
   - Format: `"protocol_id": { queryIds: [query_id], chain: 'solana' }`

4. **`server/src/config/fee-config.ts`** (Optional but recommended)
   - Verify protocol is added to `PROTOCOL_FEES`
   - Format: `'protocol_id': '1.0%'`

**Quick Fix Checklist**:
- [ ] Added to rolling-refresh-config.ts
- [ ] Added to chainProtocols.ts
- [ ] Added to dataManagementService.ts (PUBLIC and PRIVATE)
- [ ] Added to fee-config.ts
- [ ] Rebuilt backend: `npm run server:build`
- [ ] Restarted backend server

### Projected Stats Not Showing
**Issue**: Protocol shows in tables but "Adj. Volume" column shows '-' or no projected volume data

**Root Cause**: Missing configuration in frontend config OR data not fetched from Dune

**Solution - Check BOTH configurations**:

1. **Backend Config**: `server/src/config/projected-stats-config.ts`
   - Verify protocol is added with correct Dune query ID
   - Format: `'protocol_id': 'query_id'`

2. **Frontend Config**: `src/lib/projected-stats-config.ts` ⚠️ **OFTEN MISSED**
   - Verify protocol is added with SAME Dune query ID as backend
   - Format: `'protocol_id': 'query_id'`
   - Use empty string `''` if no projected stats (NOT placeholder text)
   - **Config Mismatch**: Frontend and backend query IDs MUST match exactly

3. **Verify Data Fetch**:
   - Check `DUNE_API_KEY` environment variable is set in `server/.env`
   - Manually trigger data fetch: `POST http://localhost:3001/api/projected-stats/update`
   - Check Supabase `projected_stats` table for protocol entries

4. **Verify Data Display**:
   - Frontend gets data from `/api/protocols/daily-metrics` endpoint
   - Projected volume appears in "Adj. Volume" column
   - If column shows '-', check browser console for errors

**Quick Fix Checklist**:
- [ ] Added to backend projected-stats-config.ts
- [ ] Added to frontend projected-stats-config.ts (MUST be same query ID)
- [ ] Added to ProtocolManagement.tsx category array (for Settings page)
- [ ] DUNE_API_KEY set in server/.env
- [ ] Called /api/projected-stats/update endpoint
- [ ] Verified data in projected_stats table
- [ ] Restarted backend server
- [ ] Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+F5)

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