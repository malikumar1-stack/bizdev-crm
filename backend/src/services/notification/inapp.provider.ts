import { INotificationProvider, NotificationPayload } from './types';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';

export class InAppProvider implements INotificationProvider {
  name = 'IN_APP';

  async send(payload: NotificationPayload) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: payload.userId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          entityType: payload.entityType,
          entityId: payload.entityId,
          channelsJson: JSON.stringify(payload.channels || ['IN_APP']),
          read: false,
          sentAt: new Date()
        }
      });
      return { success: true, channel: this.name, details: { id: notification.id } };
    } catch (err: any) {
      logger.error('InAppProvider error:', err);
      return { success: false, channel: this.name, error: err.message };
    }
  }
}
