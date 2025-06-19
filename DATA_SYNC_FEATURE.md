# Data Sync Feature

## Overview
The Data Sync feature allows you to refresh the protocol data by fetching the latest CSV files from Dune API and updating the database. This feature is integrated into the sidebar navigation with time-based restrictions to ensure data freshness while preventing excessive API calls.

## Features

### 🔄 Smart Sync Button
- **Location**: Bottom of the sidebar navigation
- **Adaptive UI**: Shows different states based on availability
- **Visual Feedback**: Icons and colors indicate current status

### ⏰ Time Restrictions
- **Available After**: 10:00 AM CET daily
- **Frequency**: Maximum once per day
- **Timezone**: Central European Time (CET/CEST)

### 📊 Status Indicators

#### Button States
- **🟢 Ready to Sync**: Green download icon, enabled button
- **🔄 Syncing**: Spinning refresh icon, disabled button
- **⏳ Waiting**: Clock icon, shows countdown timer
- **❌ Error**: Alert icon, shows error message

#### Helper Text
- Shows time until next available sync
- Displays last sync timestamp
- Provides status messages and error details

### 📱 Responsive Design
- **Expanded Sidebar**: Full button with text and detailed status
- **Collapsed Sidebar**: Icon-only button with tooltip
- **Toast Notifications**: Success/error messages after sync

## Technical Implementation

### Components
- `DataSyncButton`: Main UI component
- `useDataSync`: Custom hook managing sync logic
- `useToast`: Toast notification system

### API Endpoints
- `POST /api/data-update/sync`: Triggers data sync process
- `GET /api/data-update/status`: Returns sync status

### Time Logic
- Uses CET timezone for consistency
- Tracks last sync in localStorage
- Validates sync availability every minute
- Prevents multiple syncs per day

### Data Flow
1. **Fetch CSV**: Downloads latest data from Dune API
2. **Import Database**: Clears and imports fresh data to Supabase
3. **Update UI**: Refreshes timestamps and availability
4. **User Feedback**: Shows success/error notifications

## Usage

### Manual Sync
1. Navigate to any page with the sidebar
2. Look for the sync button at the bottom
3. Check if it's available (green with download icon)
4. Click to start sync process
5. Wait for completion notification

### Status Monitoring
- **Last Sync**: Shows when data was last updated
- **Next Available**: Countdown to next allowed sync
- **Error Handling**: Clear error messages if sync fails

### Automatic Checks
- Checks server sync status on app load
- Synchronizes local and server timestamps
- Updates availability every minute

## Error Handling
- Network errors are caught and displayed
- API errors show specific error messages
- Failed syncs don't affect daily limit
- Retry available immediately after errors

## Data Sources
The sync process updates data for all configured protocols:
- Telegram Bots (BonkBot, Maestro, etc.)
- Trading Terminals (Photon, Trojan, etc.)
- Mobile Apps (Bull X, Nova, etc.)

## Security
- No authentication required for read operations
- Sync endpoint validates requests
- Error messages don't expose sensitive data
- Client-side validation prevents abuse