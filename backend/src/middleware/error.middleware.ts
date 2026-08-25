import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error(`Unhandled error on ${req.method} ${req.path}:`, err);

  const message = err.message || 'Internal Server Error';
  const statusCode = err.statusCode || 500;
  return sendError(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : undefined);
}
