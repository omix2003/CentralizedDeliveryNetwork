import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getRedisClient } from './lib/redis';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import agentRoutes from './routes/agent.routes';
import partnerRoutes from './routes/partner.routes';
import adminRoutes from './routes/admin.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Redis connection
getRedisClient();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
// JSON parser with error handling
app.use(express.json({
  strict: true
}));
app.use(express.urlencoded({ extended: true }));

// Custom JSON error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON',
      message: 'The request body contains invalid JSON. Please ensure you use double quotes for property names and values, and check for trailing commas.',
      details: err.message
    });
  }
  next(err);
});

// Request logging middleware (for debugging)
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.originalUrl}`);
  next();
});

// Health check route
app.get('/health', async (req, res) => {
  const redis = getRedisClient();
  let redisStatus = 'disconnected';
  
  try {
    await redis.ping();
    redisStatus = 'connected';
  } catch (error) {
    redisStatus = 'error';
  }
  
  res.json({ 
    status: 'ok', 
    message: 'Backend server is running',
    redis: redisStatus
  });
});

// API routes
console.log('📦 Registering API routes...');
try {
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes registered at /api/auth');

  app.use('/api/agent', agentRoutes);
  console.log('✅ Agent routes registered at /api/agent');

  app.use('/api/partner', partnerRoutes);
  console.log('✅ Partner routes registered at /api/partner');

  app.use('/api/admin', adminRoutes);
  console.log('✅ Admin routes registered at /api/admin');
} catch (error) {
  console.error('❌ Error registering routes:', error);
}

// Debug route to test routing
app.get('/api/test', (req, res) => {
  res.json({ message: 'API routing is working', path: req.path });
});

// 404 handler - must be last
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    availableRoutes: [
      'GET /health',
      'GET /api/test',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/me'
    ]
  });
});

// Error handler
// app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
//   console.error(err.stack);
//   res.status(500).json({ error: 'Something went wrong!' });
// });

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 Available endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`   GET  http://localhost:${PORT}/api/test`);
  console.log(`   POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   POST http://localhost:${PORT}/api/auth/register`);
  console.log(`   GET  http://localhost:${PORT}/api/auth/me`);
});



