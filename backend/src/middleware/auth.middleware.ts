import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../utils/prisma';
import { sendError } from '../utils/response';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tokenVersion?: number;
  phone?: string | null;
  whatsapp?: string | null;
  whatsappNumber?: string | null;
  countryCode?: string | null;
  notificationEmail?: string | null;
  status?: string;
  active?: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// In-memory IP rate limiter for authentication endpoints
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function loginRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || 'unknown-ip';
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record) {
    if (now > record.resetAt) {
      loginAttempts.set(ip, { count: 1, resetAt: now + 60000 });
    } else {
      if (record.count >= 10) {
        return sendError(res, 'Too many login attempts from this IP. Please wait 1 minute before trying again.', 429);
      }
      record.count += 1;
    }
  } else {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60000 });
  }

  next();
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return sendError(res, 'Authentication token required', 401);
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tokenVersion: true,
        active: true,
        status: true,
        phone: true,
        whatsapp: true,
        whatsappNumber: true,
        countryCode: true,
        notificationEmail: true
      }
    });

    if (!user || user.status === 'INACTIVE' || !user.active) {
      return sendError(res, 'User account is inactive or not found', 403);
    }

    // Token Version Invalidation Check
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
      return sendError(res, 'Session invalidated due to security or password update. Please sign in again.', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    return sendError(res, 'Invalid or expired authentication token', 401);
  }
}

export const authenticate = authenticateToken;
