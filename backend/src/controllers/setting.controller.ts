import { Response } from 'express';
import nodemailer from 'nodemailer';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit/audit.service';
import { WhatsAppProvider } from '../services/notification/whatsapp.provider';

export class SettingController {
  static async getSettings(req: AuthRequest, res: Response) {
    try {
      const settings = await prisma.setting.findMany();
      const settingsMap: Record<string, string> = {};
      settings.forEach((s) => {
        // Mask passwords before sending to frontend
        if (s.key.includes('password') || s.key.includes('api_key')) {
          settingsMap[s.key] = s.value ? '••••••••' : '';
        } else {
          settingsMap[s.key] = s.value;
        }
      });
      return sendSuccess(res, settingsMap);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async updateSettings(req: AuthRequest, res: Response) {
    try {
      const updates = req.body as Record<string, string>;

      for (const [key, value] of Object.entries(updates)) {
        // Don't overwrite password if masked placeholder was submitted
        if ((key.includes('password') || key.includes('api_key')) && value === '••••••••') {
          continue;
        }
        await prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value }
        });
      }

      AuditService.log(req.user!.id, 'UPDATE_SETTINGS', 'SETTING', 'SYSTEM');
      return sendSuccess(res, null, 'Settings saved successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async testEmail(req: AuthRequest, res: Response) {
    try {
      const { recipientEmail, host, port, user, password, senderEmail, senderName } = req.body;
      const targetEmail = recipientEmail || req.user!.email;

      // Get settings from DB if not provided in test payload
      const [dbHost, dbPort, dbUser, dbPass, dbSenderEmail, dbSenderName] = await Promise.all([
        prisma.setting.findUnique({ where: { key: 'smtp_host' } }),
        prisma.setting.findUnique({ where: { key: 'smtp_port' } }),
        prisma.setting.findUnique({ where: { key: 'smtp_user' } }),
        prisma.setting.findUnique({ where: { key: 'smtp_password' } }),
        prisma.setting.findUnique({ where: { key: 'smtp_sender_email' } }),
        prisma.setting.findUnique({ where: { key: 'smtp_sender_name' } })
      ]);

      const finalHost = host || dbHost?.value || process.env.SMTP_HOST;
      const finalPort = parseInt(port || dbPort?.value || process.env.SMTP_PORT || '587', 10);
      const finalUser = user || dbUser?.value || process.env.SMTP_USER;
      const finalPass = password && password !== '••••••••' ? password : (dbPass?.value || process.env.SMTP_PASS);
      const finalSender = senderEmail || dbSenderEmail?.value || process.env.SMTP_FROM || 'crm@bizdevcrm.com';
      const finalSenderName = senderName || dbSenderName?.value || 'BizDev CRM';

      if (!finalHost || !finalUser || !finalPass) {
        // Record test log
        await prisma.notificationLog.create({
          data: {
            userId: req.user!.id,
            recipientName: req.user!.name,
            recipientContact: targetEmail,
            channel: 'EMAIL',
            type: 'TEST_EMAIL',
            title: 'Test Email Diagnostic',
            message: 'Attempted to send test email',
            status: 'FAILED',
            error: 'SMTP credentials are not configured in system settings or environment variables.'
          }
        });

        return sendError(res, 'Email failed: SMTP credentials are not configured. Please fill in SMTP Host, Username, and Password.', 400);
      }

      let transportOptions: any = {
        host: finalHost,
        port: finalPort,
        secure: finalPort === 465,
        auth: { user: finalUser, pass: finalPass },
        connectionTimeout: 12000,
        greetingTimeout: 12000,
        socketTimeout: 15000
      };

      // Gmail SSL/Service bypass for cloud hosts (like Render) that block port 587
      if (finalHost.includes('gmail.com') || (finalUser && finalUser.includes('@gmail.com'))) {
        transportOptions = {
          service: 'gmail',
          auth: { user: finalUser, pass: finalPass },
          connectionTimeout: 12000,
          greetingTimeout: 12000,
          socketTimeout: 15000
        };
      }

      const transporter = nodemailer.createTransport(transportOptions);

      const info = await transporter.sendMail({
        from: `"${finalSenderName}" <${finalSender}>`,
        to: targetEmail,
        subject: '✓ BizDev CRM Test Email Verification',
        text: 'This is a verified test email from your BizDev CRM system. Automated email dispatch is configured correctly.',
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background: #0c8ee9; padding: 24px; color: white;">
              <h2 style="margin: 0; font-size: 20px;">✓ SMTP Email Verification Successful</h2>
              <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 13px;">BizDev CRM System Diagnostic</p>
            </div>
            <div style="padding: 24px; color: #1e293b;">
              <p style="font-size: 15px;">Hello ${req.user!.name},</p>
              <p style="font-size: 14px; line-height: 1.6;">Your SMTP configuration is active and working properly. The CRM will automatically dispatch 24-hour and 1-hour meeting reminders and follow-up notifications to team members.</p>
              <div style="margin-top: 20px; padding: 12px; background: #f8fafc; border-radius: 6px; font-size: 12px; color: #64748b;">
                <strong>Host:</strong> ${finalHost}:${finalPort} &bull; <strong>Sender:</strong> ${finalSender}
              </div>
            </div>
          </div>
        `
      });

      await prisma.notificationLog.create({
        data: {
          userId: req.user!.id,
          recipientName: req.user!.name,
          recipientContact: targetEmail,
          channel: 'EMAIL',
          type: 'TEST_EMAIL',
          title: 'Test Email Diagnostic',
          message: 'Test email delivered successfully',
          status: 'SENT',
          metadataJson: JSON.stringify({ messageId: info.messageId, response: info.response })
        }
      });

      return sendSuccess(res, { messageId: info.messageId }, '✓ Test email sent successfully.');
    } catch (err: any) {
      await prisma.notificationLog.create({
        data: {
          userId: req.user!.id,
          recipientName: req.user!.name,
          recipientContact: req.body.recipientEmail || req.user!.email,
          channel: 'EMAIL',
          type: 'TEST_EMAIL',
          title: 'Test Email Diagnostic',
          message: 'Failed to deliver test email',
          status: 'FAILED',
          error: err.message
        }
      });

      return sendError(res, `✕ Email failed. Reason: ${err.message}`, 400);
    }
  }

  static async testWhatsApp(req: AuthRequest, res: Response) {
    try {
      const { phone, message } = req.body;
      const targetPhone = phone || req.user!.whatsappNumber || req.user!.phone;

      if (!targetPhone) {
        return sendError(res, 'WhatsApp test failed: Recipient phone number is required.', 400);
      }

      // Check DB settings for official API
      const [dbUrl, dbKey, dbPhoneId] = await Promise.all([
        prisma.setting.findUnique({ where: { key: 'whatsapp_api_url' } }),
        prisma.setting.findUnique({ where: { key: 'whatsapp_api_key' } }),
        prisma.setting.findUnique({ where: { key: 'whatsapp_phone_number_id' } })
      ]);

      const apiUrl = dbUrl?.value || process.env.WHATSAPP_API_URL;
      const apiKey = dbKey?.value || process.env.WHATSAPP_API_KEY;
      const phoneId = dbPhoneId?.value || process.env.WHATSAPP_PHONE_NUMBER_ID;

      const clickUrl = WhatsAppProvider.generateClickToChatUrl(targetPhone, message || 'Test WhatsApp message from BizDev CRM');

      if (!apiUrl || !apiKey || !phoneId) {
        await prisma.notificationLog.create({
          data: {
            userId: req.user!.id,
            recipientName: req.user!.name,
            recipientContact: targetPhone,
            channel: 'WHATSAPP',
            type: 'TEST_WHATSAPP',
            title: 'WhatsApp Integration Diagnostic',
            message: message || 'Test WhatsApp message',
            status: 'NOT_CONFIGURED',
            error: 'WhatsApp integration not configured. Direct wa.me link is available for manual dispatch.',
            metadataJson: JSON.stringify({ clickUrl })
          }
        });

        return sendSuccess(res, {
          status: 'NOT_CONFIGURED',
          message: 'WhatsApp integration not configured.',
          clickUrl
        }, 'WhatsApp integration not configured. Click-to-chat link available.');
      }

      // Call official WhatsApp Cloud API
      const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
      const response = await fetch(`${apiUrl}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: message || '✓ BizDev CRM Official WhatsApp Test Message' }
        })
      });

      const data: any = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'WhatsApp Cloud API request failed');
      }

      await prisma.notificationLog.create({
        data: {
          userId: req.user!.id,
          recipientName: req.user!.name,
          recipientContact: targetPhone,
          channel: 'WHATSAPP',
          type: 'TEST_WHATSAPP',
          title: 'WhatsApp Integration Diagnostic',
          message: message || 'Test WhatsApp message',
          status: 'SENT',
          metadataJson: JSON.stringify(data)
        }
      });

      return sendSuccess(res, data, '✓ WhatsApp test message sent successfully via Official API.');
    } catch (err: any) {
      await prisma.notificationLog.create({
        data: {
          userId: req.user!.id,
          recipientName: req.user!.name,
          recipientContact: req.body.phone || req.user!.phone || 'N/A',
          channel: 'WHATSAPP',
          type: 'TEST_WHATSAPP',
          title: 'WhatsApp Integration Diagnostic',
          message: req.body.message || 'Test message',
          status: 'FAILED',
          error: err.message
        }
      });

      return sendError(res, `✕ WhatsApp failed. Reason: ${err.message}`, 400);
    }
  }

  static async getNotificationLogs(req: AuthRequest, res: Response) {
    try {
      const { page = '1', limit = '50', channel, status } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (channel) where.channel = channel;
      if (status) where.status = status;

      const [total, logs] = await Promise.all([
        prisma.notificationLog.count({ where }),
        prisma.notificationLog.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { sentAt: 'desc' },
          include: { user: { select: { id: true, name: true, email: true } } }
        })
      ]);

      return sendSuccess(res, logs, 'Notification logs retrieved', 200, {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getAuditLogs(req: AuthRequest, res: Response) {
    try {
      const { page = '1', limit = '50' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const [total, logs] = await Promise.all([
        prisma.auditLog.count(),
        prisma.auditLog.findMany({
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true, email: true, role: true } } }
        })
      ]);

      return sendSuccess(res, logs, 'Audit logs retrieved', 200, {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }
}
