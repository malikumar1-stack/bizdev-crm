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

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return sendError(res, 'Authentication token required', 401);
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
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

    req.user = user;
    next();
  } catch (err) {
    return sendError(res, 'Invalid or expired token', 401);
  }
}

export const authenticate = authenticateToken;
