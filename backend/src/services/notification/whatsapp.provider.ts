import { INotificationProvider, NotificationPayload } from './types';
import { config } from '../../config';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';
import { normalizePhoneNumber } from '../../utils/phone.util';

export class WhatsAppProvider implements INotificationProvider {
  name = 'WHATSAPP';

  /**
   * Generates a WhatsApp Web click-to-chat fallback URL (wa.me) for UI convenience
   */
  static generateClickToChatUrl(phone: string, text: string): string {
    const norm = normalizePhoneNumber(phone);
    const targetDigits = norm.isValid ? norm.apiNumber : phone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(text);
    return `https://wa.me/${targetDigits}?text=${encodedText}`;
  }

  async send(payload: NotificationPayload) {
    const rawPhone = payload.recipientWhatsapp || payload.recipientPhone;
    if (!rawPhone) {
      return {
        success: false,
        channel: this.name,
        error: 'Recipient WhatsApp phone number was not provided'
      };
    }

    // 1. Normalize Phone Number (Pakistan standard 03XX -> 923XX / +923XX)
    const normPhone = normalizePhoneNumber(rawPhone);
    if (!normPhone.isValid) {
      return {
        success: false,
        channel: this.name,
        error: normPhone.error || `Invalid recipient phone number format: "${rawPhone}"`
      };
    }

    const messageText = `*${payload.title}*\n\n${payload.message}`;
    const clickToChatUrl = WhatsAppProvider.generateClickToChatUrl(normPhone.apiNumber, messageText);

    // 2. Fetch API Credentials from DB Settings (fallback to environment variables)
    const [dbUrl, dbKey, dbPhoneId, dbTemplate] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'whatsapp_api_url' } }),
      prisma.setting.findUnique({ where: { key: 'whatsapp_api_key' } }),
      prisma.setting.findUnique({ where: { key: 'whatsapp_phone_number_id' } }),
      prisma.setting.findUnique({ where: { key: 'whatsapp_template_name' } })
    ]);

    const apiUrl = (dbUrl?.value || config.whatsapp.apiUrl || 'https://graph.facebook.com/v19.0').replace(/\/+$/, '');
    const apiKey = dbKey?.value || config.whatsapp.apiKey;
    const phoneNumberId = dbPhoneId?.value || config.whatsapp.phoneNumberId;
    const templateName = dbTemplate?.value || config.whatsapp.templateName;

    // 3. Strict Check: If credentials are missing, report genuinely NOT_CONFIGURED/FAILED
    if (!apiKey || !phoneNumberId) {
      const missingKeys: string[] = [];
      if (!phoneNumberId) missingKeys.push('Phone Number ID');
      if (!apiKey) missingKeys.push('API Access Token');

      const errMessage = `WhatsApp API credentials missing (${missingKeys.join(', ')}). Please configure Meta WhatsApp Cloud API credentials in Admin Settings.`;
      logger.warn(`[WHATSAPP PROVIDER] Cannot send to ${normPhone.e164}: ${errMessage}`);

      return {
        success: false,
        channel: this.name,
        error: errMessage,
        details: {
          mode: 'unconfigured',
          recipient: normPhone.e164,
          clickUrl: clickToChatUrl
        }
      };
    }

    // 4. Dispatch Request (Supports Meta Cloud API, UltraMsg, or Green API)
    try {
      // Case A: UltraMsg Gateway (Scan QR Code from any phone, 100% Free & No Meta restrictions)
      if (apiUrl.includes('ultramsg.com')) {
        const ultraEndpoint = apiUrl.endsWith('/chat') ? apiUrl : `${apiUrl.replace(/\/+$/, '')}/messages/chat`;
        logger.info(`[WHATSAPP ULTRAMSG DISPATCH] Sending to ${normPhone.e164} via ${ultraEndpoint}`);

        const response = await fetch(ultraEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: apiKey.trim(),
            to: normPhone.e164,
            body: `*${payload.title}*\n\n${payload.message}`
          })
        });

        const responseData: any = await response.json();
        if (!response.ok || responseData.error) {
          const err = responseData.error || responseData.message || `HTTP ${response.status}`;
          logger.error(`[WHATSAPP ULTRAMSG ERROR] ${err}`);
          return {
            success: false,
            channel: this.name,
            error: `UltraMsg Gateway error: ${err}`,
            details: { statusCode: response.status, recipient: normPhone.e164, data: responseData }
          };
        }

        const msgId = responseData.id || `UM-${Date.now()}`;
        return {
          success: true,
          channel: this.name,
          details: { mode: 'ultramsg_gateway', providerMessageId: String(msgId), recipient: normPhone.e164 }
        };
      }

      // Case B: Green API Gateway (Scan QR Code from phone)
      if (apiUrl.includes('green-api.com') || apiUrl.includes('greenapi')) {
        const greenEndpoint = `${apiUrl.replace(/\/+$/, '')}/waInstance${phoneNumberId}/sendMessage/${apiKey.trim()}`;
        logger.info(`[WHATSAPP GREENAPI DISPATCH] Sending to ${normPhone.e164}`);

        const response = await fetch(greenEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: `${normPhone.apiNumber}@c.us`,
            message: `*${payload.title}*\n\n${payload.message}`
          })
        });

        const responseData: any = await response.json();
        if (!response.ok || responseData.error) {
          const err = responseData.error || responseData.message || `HTTP ${response.status}`;
          return { success: false, channel: this.name, error: `Green API error: ${err}` };
        }

        return {
          success: true,
          channel: this.name,
          details: { mode: 'green_api', providerMessageId: responseData.idMessage || `GA-${Date.now()}`, recipient: normPhone.e164 }
        };
      }

      // Case C: Official Meta WhatsApp Cloud API
      const endpoint = `${apiUrl}/${phoneNumberId}/messages`;
      let requestBody: any;

      if (templateName && templateName.trim() !== '') {
        const tName = templateName.trim();
        if (tName.toLowerCase() === 'hello_world') {
          // Default built-in Meta hello_world template
          requestBody = {
            messaging_product: 'whatsapp',
            to: normPhone.apiNumber,
            type: 'template',
            template: {
              name: 'hello_world',
              language: { code: 'en_US' }
            }
          };
        } else {
          // Custom business template with dynamic parameters
          requestBody = {
            messaging_product: 'whatsapp',
            to: normPhone.apiNumber,
            type: 'template',
            template: {
              name: tName,
              language: { code: 'en_US' },
              components: [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: payload.title },
                    { type: 'text', text: payload.message.slice(0, 1024) }
                  ]
                }
              ]
            }
          };
        }
      } else {
        // Freeform text message format (standard for active customer window / test sandbox)
        requestBody = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normPhone.apiNumber,
          type: 'text',
          text: {
            preview_url: false,
            body: messageText
          }
        };
      }

      logger.info(`[WHATSAPP API DISPATCH] Sending to ${normPhone.e164} via endpoint: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const responseData: any = await response.json();

      if (!response.ok) {
        // Parse provider error accurately
        const errObj = responseData?.error;
        let providerError = 'WhatsApp Cloud API request failed';
        if (errObj) {
          const code = errObj.code ? `[Code ${errObj.code}] ` : '';
          const subcode = errObj.error_subcode ? `(Subcode ${errObj.error_subcode}) ` : '';
          const msg = errObj.message || errObj.error_user_msg || JSON.stringify(errObj);
          providerError = `${code}${subcode}${msg}`;
        } else if (responseData?.message) {
          providerError = responseData.message;
        }

        logger.error(`[WHATSAPP API ERROR] HTTP ${response.status} to ${normPhone.e164}: ${providerError}`);

        return {
          success: false,
          channel: this.name,
          error: `Provider rejected message: ${providerError}`,
          details: {
            statusCode: response.status,
            recipient: normPhone.e164,
            providerResponse: responseData,
            clickUrl: clickToChatUrl
          }
        };
      }

      const messageId = responseData.messages?.[0]?.id || responseData.id || 'ACCEPTED';
      logger.info(`[WHATSAPP API SUCCESS] Message accepted by Meta for ${normPhone.e164} (ID: ${messageId})`);

      return {
        success: true,
        channel: this.name,
        details: {
          mode: 'official_api',
          providerMessageId: messageId,
          recipient: normPhone.e164,
          data: responseData,
          clickUrl: clickToChatUrl
        }
      };
    } catch (networkErr: any) {
      logger.error(`[WHATSAPP NETWORK ERROR] Dispatch to ${normPhone.e164} failed:`, networkErr);
      return {
        success: false,
        channel: this.name,
        error: `Network / Connection error: ${networkErr.message}`,
        details: {
          recipient: normPhone.e164,
          clickUrl: clickToChatUrl
        }
      };
    }
  }
}

export const whatsappProvider = new WhatsAppProvider();
