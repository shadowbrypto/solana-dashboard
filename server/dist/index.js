import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import protocolRoutes from './routes/protocolRoutes.js';
const app = express();
const PORT = process.env.PORT || 3001;
// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
// Routes
app.use('/api/protocols', protocolRoutes);
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
app.use((err, req, res, next) => {
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
    console.log(`🔌 API endpoints: http://localhost:${PORT}/api/protocols`);
});
//# sourceMappingURL=index.js.map