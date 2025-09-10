import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import protocolRoutes from './routes/protocolRoutes.js';
import unifiedProtocolRoutes from './routes/unifiedProtocolRoutes.js';
import dataUpdateRoutes from './routes/dataUpdateRoutes.js';
import protocolConfigRoutes from './routes/protocolConfigRoutes.js';
import projectedStatsRoutes from './routes/projectedStatsRoutes.js';
import { launchpadRoutes } from './routes/launchpads.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import traderStatsRoutes from './routes/traderStatsRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // Allow all origins
  credentials: false, // Disable credentials for wider compatibility
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/protocols', protocolRoutes); // Legacy routes (backward compatibility)
app.use('/api/unified', unifiedProtocolRoutes); // New unified routes
app.use('/api/data-update', dataUpdateRoutes);
app.use('/api/protocol-config', protocolConfigRoutes);
app.use('/api', projectedStatsRoutes); // Projected stats routes
app.use('/api/launchpads', launchpadRoutes); // Launchpad routes
app.use('/api/dashboard', dashboardRoutes); // Dashboard routes
app.use('/api/trader-stats', traderStatsRoutes); // Trader stats routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Sol Analytics API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Sol Analytics API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 API endpoints:`);
  console.log(`   - Protocols (Legacy): http://localhost:${PORT}/api/protocols`);
  console.log(`   - Protocols (Unified): http://localhost:${PORT}/api/unified`);
  console.log(`   - Data Update: http://localhost:${PORT}/api/data-update`);
  console.log(`   - Protocol Config: http://localhost:${PORT}/api/protocol-config`);
  console.log(`   - Projected Stats: http://localhost:${PORT}/api/projected-stats`);
  console.log(`   - Launchpads: http://localhost:${PORT}/api/launchpads`);
  console.log(`   - Trader Stats: http://localhost:${PORT}/api/trader-stats`);
});
