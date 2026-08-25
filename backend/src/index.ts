import express from 'express';
import cors from 'cors';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { reminderScheduler } from './services/scheduler/reminder.scheduler';
import { logger } from './utils/logger';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    timezone: config.appTimezone,
    environment: config.nodeEnv
  });
});

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

// Start Server & Background Scheduler
const server = app.listen(config.port, () => {
  logger.info(`===================================================`);
  logger.info(`🚀 AI-Powered BizDev CRM Backend running on port ${config.port}`);
  logger.info(`🌐 Health check: http://localhost:${config.port}/api/health`);
  logger.info(`⏰ Configured Timezone: ${config.appTimezone}`);
  logger.info(`===================================================`);

  // Start background reminder scheduler
  reminderScheduler.start();
});

export default app;
