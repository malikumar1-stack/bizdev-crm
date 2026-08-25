import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, message: string = 'Success', statusCode: number = 200, meta?: any) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta
  });
}

export function sendError(res: Response, message: string = 'Internal Server Error', statusCode: number = 500, errors?: any) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
}
