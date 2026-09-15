import { NotificationPayload, INotificationProvider } from './types';
import { InAppProvider } from './inapp.provider';
import { EmailProvider } from './email.provider';
import { WhatsAppProvider } from './whatsapp.provider';
import { PushProvider } from './push.provider';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';
import { normalizePhoneNumber } from '../../utils/phone.util';

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
    let user = null;
    if (payload.userId) {
      user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: { preferences: true }
      });
    }

    const pref = user?.preferences;

    // Determine destination addresses from payload or user record
    const recipientEmail = payload.recipientEmail || user?.notificationEmail || user?.email;
    const rawPhone = payload.recipientWhatsapp || payload.recipientPhone || user?.whatsappNumber || user?.whatsapp || user?.phone;

    let normalizedPhoneStr = '';
    if (rawPhone) {
      const norm = normalizePhoneNumber(rawPhone);
      normalizedPhoneStr = norm.isValid ? norm.e164 : rawPhone;
      payload.recipientWhatsapp = norm.isValid ? norm.apiNumber : rawPhone;
      payload.recipientPhone = norm.isValid ? norm.apiNumber : rawPhone;
    }

    payload.recipientEmail = recipientEmail || undefined;

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

          // Determine contact string for audit log
          const contactTarget = ch === 'EMAIL' 
            ? (recipientEmail || 'N/A')
            : (ch === 'WHATSAPP' 
                ? (normalizedPhoneStr || 'N/A') 
                : (ch === 'BROWSER' ? 'Browser Push' : 'In-App Center'));

          const logStatus = res.success 
            ? 'SENT' 
            : (res.details?.mode === 'unconfigured' ? 'NOT_CONFIGURED' : 'FAILED');

          await prisma.notificationLog.create({
            data: {
              userId: payload.userId || null,
              recipientName: user?.name || payload.metadata?.recipientName || 'Stakeholder',
              recipientContact: contactTarget,
              channel: ch,
              type: payload.type || 'SYSTEM',
              title: payload.title,
              message: payload.message,
              status: logStatus,
              error: res.error || null,
              metadataJson: JSON.stringify(res.details || {})
            }
          });
        } catch (err: any) {
          logger.error(`[NOTIFICATION SERVICE] Provider ${ch} failed:`, err);
          results.push({ success: false, channel: ch, error: err.message });

          await prisma.notificationLog.create({
            data: {
              userId: payload.userId || null,
              recipientName: user?.name || payload.metadata?.recipientName || 'Stakeholder',
              recipientContact: ch === 'EMAIL' ? (recipientEmail || 'N/A') : (normalizedPhoneStr || 'N/A'),
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
