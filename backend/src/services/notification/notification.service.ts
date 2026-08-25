import { NotificationPayload, INotificationProvider } from './types';
import { InAppProvider } from './inapp.provider';
import { EmailProvider } from './email.provider';
import { WhatsAppProvider } from './whatsapp.provider';
import { PushProvider } from './push.provider';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';

export class NotificationService {
  private providers: Map<string, INotificationProvider> = new Map();

  constructor() {
    this.registerProvider(new InAppProvider());
    this.registerProvider(new EmailProvider());
    this.registerProvider(new WhatsAppProvider());
    this.registerProvider(new PushProvider());
  }

  registerProvider(provider: INotificationProvider) {
    this.providers.set(provider.name, provider);
  }

  async send(payload: NotificationPayload) {
    // 1. Fetch recipient user details and notification preferences
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { preferences: true }
    });

    const pref = user?.preferences;

    // Determine destination addresses from user record
    const recipientEmail = payload.recipientEmail || user?.notificationEmail || user?.email;
    const recipientPhone = payload.recipientPhone || user?.phone;
    const recipientWhatsapp = payload.recipientWhatsapp || user?.whatsappNumber || user?.whatsapp || user?.phone;

    payload.recipientEmail = recipientEmail;
    payload.recipientPhone = recipientPhone || undefined;
    payload.recipientWhatsapp = recipientWhatsapp || undefined;

    const channelsToSend: string[] = [];

    // Check specific reminder type toggle
    let typeEnabled = true;
    if (payload.type === 'MEETING_REMINDER' && pref && pref.meetingReminders === false) typeEnabled = false;
    if (payload.type === 'FOLLOWUP_REMINDER' && pref && pref.followupReminders === false) typeEnabled = false;
    if (payload.type === 'TASK_REMINDER' && pref && pref.taskReminders === false) typeEnabled = false;

    if (typeEnabled) {
      if (!pref || pref.inAppEnabled) channelsToSend.push('IN_APP');
      if (!pref || pref.emailEnabled) channelsToSend.push('EMAIL');
      if (!pref || pref.whatsappEnabled) channelsToSend.push('WHATSAPP');
      if (!pref || pref.browserEnabled) channelsToSend.push('BROWSER');
    }

    const requestedChannels = payload.channels && payload.channels.length > 0 ? payload.channels : channelsToSend;
    const results = [];

    for (const ch of requestedChannels) {
      const provider = this.providers.get(ch);
      if (provider) {
        try {
          const res = await provider.send(payload);
          results.push(res);

          // Log delivery status into NotificationLog table
          const contactTarget = ch === 'EMAIL' ? recipientEmail : (ch === 'WHATSAPP' ? recipientWhatsapp : (ch === 'BROWSER' ? 'Browser Push' : 'In-App Center'));
          const logStatus = res.details?.mode === 'official_api' ? 'SENT' : (res.details?.mode === 'simulated_zero_cost_log' || res.details?.mode === 'click_to_chat_url' ? 'NOT_CONFIGURED' : (res.success ? 'SENT' : 'FAILED'));
          const logError = res.error || (logStatus === 'NOT_CONFIGURED' && ch === 'WHATSAPP' ? 'WhatsApp integration not configured. Direct wa.me link generated.' : (logStatus === 'NOT_CONFIGURED' && ch === 'EMAIL' ? 'SMTP credentials not configured. Logged to simulated sandbox.' : null));

          await prisma.notificationLog.create({
            data: {
              userId: payload.userId,
              recipientName: user?.name || 'User',
              recipientContact: contactTarget || 'N/A',
              channel: ch,
              type: payload.type || 'SYSTEM',
              title: payload.title,
              message: payload.message,
              status: logStatus,
              error: logError,
              metadataJson: JSON.stringify(res.details || {})
            }
          });
        } catch (err: any) {
          logger.error(`Provider ${ch} failed:`, err);
          results.push({ success: false, channel: ch, error: err.message });

          await prisma.notificationLog.create({
            data: {
              userId: payload.userId,
              recipientName: user?.name || 'User',
              recipientContact: recipientEmail || recipientPhone || 'N/A',
              channel: ch,
              type: payload.type || 'SYSTEM',
              title: payload.title,
              message: payload.message,
              status: 'FAILED',
              error: err.message
            }
          });
        }
      }
    }

    return results;
  }
}

export const notificationService = new NotificationService();
