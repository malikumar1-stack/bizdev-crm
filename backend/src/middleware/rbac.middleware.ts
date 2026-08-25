import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { sendError } from '../utils/response';

export function requireRole(...allowedRoles: (string | string[])[]) {
  const flattened = allowedRoles.flat();
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (req.user.role === 'ADMIN') {
      return next(); // Admins have full access
    }

    if (!flattened.includes(req.user.role)) {
      return sendError(res, 'Forbidden: Insufficient role permissions', 403);
    }

    next();
  };
}
