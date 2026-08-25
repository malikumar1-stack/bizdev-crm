import { INotificationProvider, NotificationPayload } from './types';
import { config } from '../../config';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';

export class WhatsAppProvider implements INotificationProvider {
  name = 'WHATSAPP';

  /**
   * Generates a free WhatsApp Web direct click-to-chat URL (wa.me)
   */
  static generateClickToChatUrl(phone: string, text: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(text);
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }

  async send(payload: NotificationPayload) {
    const phone = payload.recipientWhatsapp || payload.recipientPhone;
    if (!phone) {
      return { success: false, channel: this.name, error: 'Recipient WhatsApp phone number not provided' };
    }

    const clickToChatUrl = WhatsAppProvider.generateClickToChatUrl(phone, `*${payload.title}*\n\n${payload.message}`);

    // Check DB settings for official API
    const [dbUrl, dbKey, dbPhoneId] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'whatsapp_api_url' } }),
      prisma.setting.findUnique({ where: { key: 'whatsapp_api_key' } }),
      prisma.setting.findUnique({ where: { key: 'whatsapp_phone_number_id' } })
    ]);

    const apiUrl = dbUrl?.value || config.whatsapp.apiUrl;
    const apiKey = dbKey?.value || config.whatsapp.apiKey;
    const phoneNumberId = dbPhoneId?.value || config.whatsapp.phoneNumberId;

    // If official WhatsApp Cloud API is configured
    if (apiUrl && apiKey && phoneNumberId) {
      try {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const response = await fetch(
          `${apiUrl}/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: cleanPhone,
              type: 'text',
              text: { body: `*${payload.title}*\n\n${payload.message}` }
            })
          }
        );
        const data: any = await response.json();
        if (!response.ok) {
          throw new Error(data.error?.message || 'WhatsApp Cloud API call failed');
        }
        return { success: true, channel: this.name, details: { mode: 'official_api', data, clickUrl: clickToChatUrl } };
      } catch (err: any) {
        logger.error('Official WhatsApp API failed:', err.message);
        return { success: false, channel: this.name, error: err.message, details: { clickUrl: clickToChatUrl } };
      }
    }

    // Zero-Cost Default / Unconfigured: Logs notification & provides ready-to-click wa.me link
    logger.info(`[WHATSAPP PROVIDER (Zero-Cost / Click-to-Chat Mode)] To: ${phone} | Link: ${clickToChatUrl}`);
    return {
      success: true,
      channel: this.name,
      details: {
        mode: 'click_to_chat_url',
        clickToChatUrl,
        phone,
        previewText: `*${payload.title}*\n${payload.message}`
      }
    };
  }
}
