import express from 'express';
import cors from 'cors';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { reminderScheduler } from './services/scheduler/reminder.scheduler';
import { prisma } from './utils/prisma';
import { logger } from './utils/logger';

const app = express();

// Configure CORS
const allowedFrontend = process.env.FRONTEND_URL;
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    if (!allowedFrontend || allowedFrontend === '*' || origin === allowedFrontend || origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    // Allow origin in development or match
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logger
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});

// Safe Health Check (Root and /api/health)
const healthHandler = async (req: express.Request, res: express.Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      timezone: config.appTimezone,
      environment: config.nodeEnv
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

// Start Server & Background Scheduler
const server = app.listen(config.port, () => {
  logger.info(`===================================================`);
  logger.info(`🚀 AI-Powered BizDev CRM Backend running on port ${config.port}`);
  logger.info(`🌐 Health check: http://localhost:${config.port}/health`);
  logger.info(`⏰ Configured Timezone: ${config.appTimezone}`);
  logger.info(`===================================================`);

  // Start background reminder scheduler with immediate boot recovery scan
  reminderScheduler.start();
});

export default app;
