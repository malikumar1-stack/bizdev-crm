import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';

export class AuditService {
  static async log(userId: string | undefined, action: string, entity: string, entityId?: string, diff?: any, ipAddress?: string) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: userId || null,
          action,
          entity,
          entityId: entityId || null,
          diffJson: diff ? JSON.stringify(diff) : null,
          ipAddress: ipAddress || null
        }
      });
    } catch (err) {
      logger.error('AuditLog error:', err);
    }
  }
}
