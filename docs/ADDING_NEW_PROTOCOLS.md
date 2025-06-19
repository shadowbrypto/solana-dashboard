# Adding New Protocols to Sol Analytics Dashboard

This guide explains how to add new protocols to the Sol Analytics Dashboard.

## Quick Steps

### 1. Backend Configuration

Add the protocol to the `PROTOCOL_SOURCES` object in `/server/src/services/dataManagementService.ts`:

```typescript
const PROTOCOL_SOURCES = {
  // ... existing protocols
  "your-protocol-name": YOUR_DUNE_QUERY_ID,
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

### 4. Sync Data

Run the data sync to fetch CSV files and update the database:

```bash
curl -X POST http://localhost:3001/api/data-update/sync
```

Or use the "Sync Data" button in the UI.

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