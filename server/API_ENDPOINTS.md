# Sol Analytics API Endpoints

## Protocol Configuration Endpoints

### GET `/api/protocol-config`
Get all protocol configurations from the database.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "protocol_id": "bonkbot",
      "category": "Telegram Bots",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### POST `/api/protocol-config`
Save multiple protocol configurations to the database.

**Request Body:**
```json
{
  "configurations": [
    {
      "protocol_id": "bonkbot",
      "category": "Telegram Bots"
    },
    {
      "protocol_id": "photon",
      "category": "Trading Terminals"
    }
  ]
}
```

### PUT `/api/protocol-config/:protocolId`
Save a single protocol configuration.

**Request Body:**
```json
{
  "category": "Telegram Bots"
}
```

### DELETE `/api/protocol-config/:protocolId`
Delete a single protocol configuration (reset to default).

### DELETE `/api/protocol-config`
Reset all protocol configurations.

### GET `/api/protocol-config/health`
Health check for protocol configuration API.

## Data Update Endpoints

### POST `/api/data-update/sync`
Triggers a full data sync process that:
1. Fetches CSV data from Dune API using the update script
2. Imports the CSV data to Supabase database

**Response:**
```json
{
  "success": true,
  "message": "Data sync completed successfully",
  "details": {
    "csvFilesFetched": 5,
    "timestamp": "2023-12-07T10:30:00.000Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to fetch CSV data from Dune API",
  "step": "fetch_csv"
}
```

### GET `/api/data-update/status`
Returns the current sync status and information about available data.

**Response:**
```json
{
  "success": true,
  "lastSync": "2023-12-07T10:30:00.000Z",
  "csvFilesCount": 5,
  "csvFiles": ["bonkbot", "jup", "photon", "trojan", "bullx"]
}
```

## Protocol Endpoints

### GET `/api/protocols/stats`
Get protocol statistics with optional filtering.

**Query Parameters:**
- `protocol` (optional): Single protocol name or comma-separated list

### GET `/api/protocols/daily-metrics`
Get daily metrics for a specific date.

**Query Parameters:**
- `date` (required): Date in YYYY-MM-DD format

### GET `/api/protocols/total-stats`
Get total aggregated statistics.

### GET `/api/protocols/aggregated-stats`
Get pre-aggregated data for all protocols by date.

### GET `/api/protocols/weekly-insights`
Get AI-generated insights for the past week.

## Health Check

### GET `/health`
Simple health check endpoint.

**Response:**
```json
{
  "success": true,
  "message": "Sol Analytics API is running",
  "timestamp": "2023-12-07T10:30:00.000Z",
  "version": "1.0.0"
}
```