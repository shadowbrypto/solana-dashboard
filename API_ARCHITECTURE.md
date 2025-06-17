# Sol Analytics API Architecture

## Overview

The Sol Analytics dashboard has been refactored to use a backend API architecture for better performance and scalability. The database queries are now handled by a dedicated Express.js backend server, while the frontend React application consumes data through REST API endpoints.

## Architecture

```
Frontend (React + Vite) ←→ Backend API (Express.js) ←→ Supabase Database
     Port 3000                    Port 3001
```

## Backend API

### Location
- **Path**: `/server/`
- **Port**: 3001
- **Technology**: Express.js + TypeScript

### API Endpoints

#### Protocol Stats
- **GET** `/api/protocols/stats`
  - Query params: `protocol` (optional, single string or comma-separated list)
  - Returns: Array of protocol statistics with formatted dates

#### Total Protocol Stats  
- **GET** `/api/protocols/total-stats`
  - Query params: `protocol` (optional)
  - Returns: Aggregated metrics for all protocols or specific protocol

#### Daily Metrics
- **GET** `/api/protocols/daily-metrics`
  - Query params: `date` (required, format: YYYY-MM-DD)
  - Returns: Protocol metrics for a specific date

#### Health Check
- **GET** `/api/protocols/health`
  - Returns: API health status and timestamp

### Caching Strategy

The backend implements a two-tier caching system:
1. **Backend Cache**: 1-hour cache for database queries
2. **Frontend Cache**: 5-minute cache for API responses with fallback to expired cache on API errors

### Environment Variables

Create `/server/.env` with:
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_key
```

## Frontend Changes

### API Client
- **Location**: `/src/lib/api.ts`
- **Features**: 
  - Type-safe API calls
  - Error handling with custom ApiError class
  - Automatic JSON parsing and response validation

### Updated Protocol Service
- **Location**: `/src/lib/protocol.ts`
- **Changes**: 
  - Removed direct Supabase queries
  - Added API client integration
  - Maintained same interface for backward compatibility
  - Added fallback to expired cache on API errors

### Environment Variables

Create `/.env.local` with:
```env
REACT_APP_API_URL=http://localhost:3001/api
```

## Development

### Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
npm run server:install
```

### Running the Application

#### Option 1: Run Both Services Concurrently
```bash
npm run dev:full
```

#### Option 2: Run Services Separately
```bash
# Terminal 1: Backend
npm run server:dev

# Terminal 2: Frontend  
npm run dev
```

### Available Scripts

#### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

#### Backend
- `npm run server:dev` - Start backend in development mode
- `npm run server:build` - Build backend for production
- `npm run server:start` - Start production backend

#### Combined
- `npm run dev:full` - Run both frontend and backend in development
- `npm run start:full` - Run both frontend and backend in production

## Benefits

1. **Performance**: Reduced frontend bundle size and faster initial load
2. **Scalability**: Backend can handle multiple frontend clients
3. **Caching**: Improved caching strategy with fallback mechanisms
4. **Separation of Concerns**: Clear separation between UI and data logic
5. **Error Handling**: Better error handling with graceful fallbacks
6. **Development**: Independent development and deployment of frontend/backend

## API Response Format

All API responses follow this structure:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

## Error Handling

- API errors are wrapped in custom `ApiError` class
- Frontend falls back to expired cache data when API is unavailable
- Comprehensive error logging on both frontend and backend
- Graceful degradation for better user experience
