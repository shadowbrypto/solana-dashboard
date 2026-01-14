# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend Development
```bash
npm run dev              # Start frontend development server (port 3000)
npm run build           # Build frontend for production
npm run preview         # Preview production build
```

### Backend Development
```bash
npm run server:dev      # Start backend development server (port 3001)
npm run server:build    # Build backend TypeScript
npm run server:start    # Start backend in production mode
```

### Full Stack Development
```bash
npm run dev:full        # Start both frontend and backend concurrently
npm run start:full      # Start both in production mode
```

### Testing
```bash
npm run test            # Run tests in watch mode
npm run test:run        # Run tests once
npm run test:coverage   # Run tests with coverage
npm run test:individual # Test individual protocol components
npm run test:daily-metrics  # Test daily metrics functionality
npm run test:charts     # Test chart components
```

### Data Management
```bash
npm run server:import-csv        # Import CSV data to database
npm run server:import-csv-upsert # Import with upsert operation
npm run server:update-data       # Update all data from sources
```

## Architecture Overview

This is a **full-stack analytics dashboard** for Solana and EVM trading protocols with a React frontend and Express.js backend.

### Core Architecture
```
Frontend (React + Vite) ←→ Backend API (Express.js) ←→ MySQL Database
     Port 3000                    Port 3001
```

### Key Technologies
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend**: Express.js, TypeScript, MySQL client
- **Database**: MySQL
- **Charts**: Recharts library
- **Testing**: Vitest, React Testing Library

## Core Data Flow

### Protocol System
- **Protocol Types**: Defined in `src/types/protocol.ts` as union type
- **Protocol Configuration**: Centralized in `src/lib/protocol-config.ts`
- **Chain Support**: Solana and EVM protocols with chain-specific routing

### Data Sources
- **Primary**: MySQL database via backend API
- **CSV Import**: Scripts for importing CSV data to database
- **Caching**: Two-tier caching (backend 30s, frontend 15min)
- **Dune Analytics**: External data source for protocol metrics and projected stats

### Projected Stats System (Dual Configuration)

**⚠️ IMPORTANT**: Projected volume data requires configuration in TWO separate files:

1. **Backend Config**: `server/src/config/projected-stats-config.ts`
   - Defines Dune query IDs for fetching projected volume data
   - Used by backend services to fetch data from Dune Analytics

2. **Frontend Config**: `src/lib/projected-stats-config.ts`
   - Same Dune query IDs as backend config
   - Used for validation and display logic in UI components
   - Missing this will prevent "Adj. Volume" column from showing data

**Data Flow**:
1. Backend fetches data from Dune Analytics using backend config
2. Data stored in MySQL `projected_stats` table
3. Frontend requests data via `/api/protocols/daily-metrics` endpoint
4. Frontend validates using frontend config before displaying
5. Displayed as "Adj. Volume" column in DailyMetricsTable

**API Endpoints**:
- `POST /api/projected-stats/update` - Fetch latest data from Dune
- `GET /api/protocols/daily-metrics` - Get protocol metrics with projected volume

**Environment Variables**:
- `DUNE_API_KEY` - Required in `server/.env` for Dune Analytics API access

**Configuration Synchronization (CRITICAL)**:
⚠️ The frontend and backend projected stats configs MUST be kept in sync:
- When adding a protocol: Update BOTH files with same query ID
- When updating a query ID: Update BOTH files
- Use empty string `''` for protocols without projected stats
- Mismatched configs cause:
  - Settings page to show incomplete protocol list
  - "Adj. Volume" column to not display data
  - UI validation failures

**How to Verify Sync**:
1. Open both `server/src/config/projected-stats-config.ts` and `src/lib/projected-stats-config.ts`
2. Compare query IDs for each protocol - they must match exactly
3. Check that all protocols with backend query IDs also have frontend query IDs
4. Empty strings (`''`) are acceptable for protocols without projected stats

### Report Types
- **Daily Report**: Single day metrics with protocol breakdown
- **Weekly Report**: 7-day trending with growth analysis
- **Monthly Report**: Month-over-month comparisons
- **EVM Reports**: Separate EVM-specific reporting for multi-chain data

## Key Components Architecture

### Layout System
- **Layout.tsx**: Main application shell with sidebar navigation
- **CollapsibleSidebar.tsx**: Protocol navigation with categorization
- **Route Structure**: Page-based routing with React Router

### Table Components
- **DailyMetricsTable.tsx**: Main daily metrics display with drag-and-drop columns
- **WeeklyMetricsTable.tsx**: Weekly trending with charts and growth indicators  
- **EVMWeeklyMetricsTable.tsx**: EVM-specific weekly metrics
- **MonthlyMetricsTable.tsx**: Monthly comparison tables

### Chart Components
- **Location**: `src/components/charts/`
- **Types**: AreaChart, BarChart, HeatMap, Timeline, Stacked charts
- **Integration**: Recharts-based with responsive containers

### Data Management
- **API Client**: `src/lib/api.ts` - Centralized API communication
- **Protocol Config**: `src/lib/protocol-config.ts` - Protocol definitions
- **Settings**: `src/lib/settings.ts` - User preferences persistence

## Environment Setup

### Backend Configuration
1. Create `server/.env` with MySQL credentials:
   ```
   MYSQL_HOST=your_mysql_host
   MYSQL_PORT=3306
   MYSQL_USER=your_mysql_user
   MYSQL_PASSWORD=your_mysql_password
   MYSQL_DATABASE=your_database_name
   DUNE_API_KEY=your_dune_api_key
   ```

### Frontend Configuration
- API connection automatically configured to `http://localhost:3001/api`
- Environment variables via `VITE_` prefix

## Database Schema

### Core Tables
- **protocol_stats**: Main metrics table with date-based records
- **Chain Support**: `chain` column for multi-chain protocol support
- **Indexing**: Optimized for date-range queries and protocol filtering

### Data Migration
- **Scripts**: Located in `server/migrations/`
- **EVM Migration**: Automated chain data migration via `evmDataMigrationServiceSimple.ts`

## Adding New Protocols

**⚠️ CRITICAL**: New protocols require configuration in MULTIPLE files. See `NEW_PROTOCOL_INTEGRATION_GUIDE.md` for complete instructions.

### Required Frontend Files (4 files)
1. `src/types/protocol.ts` - Add to Protocol union type
2. `src/components/icons/index.tsx` - Create icon component
3. `src/lib/protocol-config.ts` - Add to protocolConfigs array
4. `public/assets/logos/{protocol}.jpg` - Add logo image (optional)

### Required Backend Config Files (6 files)
1. `server/src/services/dataManagementService.ts` - Add to PUBLIC_PROTOCOL_SOURCES
2. `server/src/services/dataManagementService.ts` - Add to PRIVATE_PROTOCOL_SOURCES
3. `server/src/config/rolling-refresh-config.ts` - **CRITICAL** for data refresh
4. `server/src/config/chainProtocols.ts` - **CRITICAL** for chain routing
5. `server/src/config/fee-config.ts` - For fee calculations (recommended)
6. `server/src/config/projected-stats-config.ts` - For projected volume (optional)

### Optional: Projected Stats (3 files required if using)
1. `server/src/config/projected-stats-config.ts` - Backend Dune query ID
2. `src/lib/projected-stats-config.ts` - Frontend Dune query ID (MUST match backend)
3. `src/components/ProtocolManagement.tsx` - Add to category's hardcoded array for Settings page

**Missing critical files will cause "Protocol not found in protocol sources" errors!**

### EVM Protocols
1. Follow same steps as Solana protocols
2. Set `chain: 'evm'` in protocol config
3. Ensure EVM data sources are configured in backend

## Key Service Files

### Backend Services
- **protocolService.ts**: Core data fetching with caching
- **dataUpdateService.ts**: CSV import and data sync
- **protocolConfigService.ts**: Protocol configuration management

### Frontend Services
- **api.ts**: API client with error handling and caching
- **protocol-config.ts**: Protocol configuration and categorization
- **settings.ts**: User preferences and state persistence

## Testing Strategy

### Test Structure
- **Unit Tests**: Component-level testing with React Testing Library
- **Integration Tests**: API integration and data flow testing
- **Chart Tests**: Recharts component rendering validation
- **Mock Data**: Centralized in `src/test/mocks.ts`

### Test Utilities
- **Setup**: `src/test/setup.ts` - Test environment configuration
- **Utils**: `src/test/utils.ts` - Common testing utilities
- **Coverage**: Focus on critical data transformation and UI interactions

## Performance Considerations

### Caching Strategy
- **Backend Cache**: 1-hour cache for expensive database queries
- **Frontend Cache**: 5-minute cache with fallback to expired cache
- **Cache Invalidation**: Automatic after data updates

### Image Optimization
- **Logo Management**: Centralized logo system with fallback handling
- **Asset Loading**: Optimized logo loading with error boundaries

### Data Export
- **Screenshot Export**: `dom-to-image` library for table/chart export
- **Download Options**: PNG export with styling preservation
- **Clipboard Support**: Copy-to-clipboard functionality

## Development Workflow

### Adding New Features
1. Define data types in `src/types/`
2. Create API endpoints in `server/src/routes/`
3. Add service layer in `server/src/services/`
4. Build React components in `src/components/`
5. Add to appropriate page in `src/pages/`

### Code Style
- **TypeScript**: Strict mode enabled
- **Components**: Functional components with hooks
- **Styling**: TailwindCSS with shadcn/ui components
- **State Management**: React hooks and context for global state