import { INotificationProvider, NotificationPayload } from './types';
import { logger } from '../../utils/logger';

export class PushProvider implements INotificationProvider {
  name = 'BROWSER';

  async send(payload: NotificationPayload) {
    logger.info(`[BROWSER PUSH PROVIDER] Notification dispatched for User ${payload.userId}: ${payload.title}`);
    return { success: true, channel: this.name, details: { dispatched: true } };
  }
}
