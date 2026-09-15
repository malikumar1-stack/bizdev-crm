import { Response } from 'express';
import nodemailer from 'nodemailer';
import { startOfDay, subDays } from 'date-fns';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit/audit.service';
import { whatsappProvider } from '../services/notification/whatsapp.provider';
import { reminderScheduler } from '../services/scheduler/reminder.scheduler';
import { normalizePhoneNumber } from '../utils/phone.util';
import { config } from '../config';

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
      const { recipientEmail, host, port, user, password, senderEmail, senderName, resendApiKey } = req.body;
      const targetEmail = recipientEmail || req.user!.notificationEmail || req.user!.email;

      // Check DB settings
      const [dbResendKey, dbHost, dbPort, dbUser, dbPass, dbSenderEmail, dbSenderName] = await Promise.all([
        prisma.setting.findUnique({ where: { key: 'resend_api_key' } }),
        prisma.setting.findUnique({ where: { key: 'smtp_host' } }),
        prisma.setting.findUnique({ where: { key: 'smtp_port' } }),
        prisma.setting.findUnique({ where: { key: 'smtp_user' } }),
        prisma.setting.findUnique({ where: { key: 'smtp_password' } }),
        prisma.setting.findUnique({ where: { key: 'smtp_sender_email' } }),
        prisma.setting.findUnique({ where: { key: 'smtp_sender_name' } })
      ]);

      const finalResendKey = resendApiKey && resendApiKey !== '••••••••' ? resendApiKey : (dbResendKey?.value || process.env.RESEND_API_KEY);
      const finalHost = host || dbHost?.value || process.env.SMTP_HOST;
      const finalPort = parseInt(port || dbPort?.value || process.env.SMTP_PORT || '587', 10);
      const finalUser = user || dbUser?.value || process.env.SMTP_USER;
      const finalPass = password && password !== '••••••••' ? password : (dbPass?.value || process.env.SMTP_PASS);
      const finalSender = senderEmail || dbSenderEmail?.value || process.env.SMTP_FROM || 'crm@jsil.com';
      const finalSenderName = senderName || dbSenderName?.value || 'JS Investments BD CRM';

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background: #002D62; padding: 20px; color: white; border-bottom: 3px solid #E5A823;">
            <h2 style="margin: 0; font-size: 18px; color: #ffffff;">✓ JS Investments CRM Email Test Verification</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #E5A823; font-weight: 600;">Automated Notification Diagnostic</p>
          </div>
          <div style="padding: 20px; color: #1e293b;">
            <p style="font-size: 15px;">Hello ${req.user!.name},</p>
            <p style="font-size: 14px; line-height: 1.6;">Your JS Investments CRM notification transport is active and delivering emails! Meeting reminders (24h & 1h milestones) will automatically reach your team members.</p>
            <div style="margin-top: 20px; padding: 12px; background: #f8fafc; border-radius: 6px; font-size: 12px; color: #64748b; border-left: 3px solid #002D62;">
              <strong>Transport:</strong> ${finalResendKey ? 'Resend HTTPS Cloud API (Port 443)' : `SMTP (${finalHost})`} &bull; <strong>Recipient:</strong> ${targetEmail}
            </div>
          </div>
        </div>
      `;

      // 1. If Resend HTTPS API Key is present
      if (finalResendKey) {
        const fromEmail = finalSender.includes('@') ? finalSender : 'onboarding@resend.dev';
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${finalResendKey}`
          },
          body: JSON.stringify({
            from: `${finalSenderName} <${fromEmail}>`,
            to: [targetEmail],
            subject: '✓ JS Investments CRM Test Email Verification',
            html: emailHtml,
            text: 'This is a verified test email from JS Investments Business Development CRM system.'
          })
        });

        const resData: any = await resendRes.json();
        if (!resendRes.ok) {
          throw new Error(resData.message || resData.error?.message || 'Resend API delivery failed');
        }

        await prisma.notificationLog.create({
          data: {
            userId: req.user!.id,
            recipientName: req.user!.name,
            recipientContact: targetEmail,
            channel: 'EMAIL',
            type: 'TEST_EMAIL',
            title: 'Test Email Diagnostic',
            message: 'Test email successfully dispatched via Resend HTTPS API',
            status: 'SENT',
            metadataJson: JSON.stringify(resData)
          }
        });

        return sendSuccess(res, { messageId: resData.id, mode: 'RESEND_HTTPS' }, 'Verified test email sent successfully via Resend HTTPS API!');
      }

      // 2. Try SMTP if credentials are provided
      if (finalHost && finalUser && finalPass) {
        let transportOptions: any = {
          host: finalHost,
          port: finalPort,
          secure: finalPort === 465,
          auth: { user: finalUser, pass: finalPass },
          connectionTimeout: 8000,
          greetingTimeout: 8000,
          socketTimeout: 8000
        };

        if (finalHost.includes('gmail.com') || (finalUser && finalUser.includes('@gmail.com'))) {
          transportOptions = {
            service: 'gmail',
            auth: { user: finalUser, pass: finalPass },
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 8000
          };
        }

        const transporter = nodemailer.createTransport(transportOptions);
        const info = await transporter.sendMail({
          from: `"${finalSenderName}" <${finalSender}>`,
          to: targetEmail,
          subject: '✓ JS Investments CRM Test Email Verification',
          text: 'This is a verified test email from JS Investments BD CRM system.',
          html: emailHtml
        });

        await prisma.notificationLog.create({
          data: {
            userId: req.user!.id,
            recipientName: req.user!.name,
            recipientContact: targetEmail,
            channel: 'EMAIL',
            type: 'TEST_EMAIL',
            title: 'Test Email Diagnostic',
            message: 'Test email successfully dispatched via SMTP',
            status: 'SENT',
            metadataJson: JSON.stringify(info)
          }
        });

        return sendSuccess(res, { messageId: info.messageId, mode: 'SMTP' }, '✓ Test email delivered to your inbox via SMTP!');
      }

      return sendError(res, 'No email credentials configured. Please provide SMTP details or Resend API key.', 400);
    } catch (err: any) {
      await prisma.notificationLog.create({
        data: {
          userId: req.user!.id,
          recipientName: req.user!.name,
          recipientContact: req.body.recipientEmail || req.user!.email,
          channel: 'EMAIL',
          type: 'TEST_EMAIL',
          title: 'Test Email Diagnostic',
          message: 'Test email delivery failed',
          status: 'FAILED',
          error: err.message
        }
      });
      return sendError(res, `✕ Email delivery failed: ${err.message}`, 400);
    }
  }

  static async testWhatsApp(req: AuthRequest, res: Response) {
    try {
      const { phone, message } = req.body;
      const rawTargetPhone = phone || req.user!.whatsappNumber || req.user!.whatsapp || req.user!.phone;

      if (!rawTargetPhone) {
        return sendError(res, 'WhatsApp test failed: Recipient phone number is required. Please enter a valid mobile number (e.g. 03001234567).', 400);
      }

      // 1. Normalize phone number
      const norm = normalizePhoneNumber(rawTargetPhone);
      if (!norm.isValid) {
        return sendError(res, `Invalid phone number format: "${rawTargetPhone}". ${norm.error || 'Expected Pakistani mobile (03XX-XXXXXXX) or international format.'}`, 400);
      }

      const msg = message || '✓ JS Investments BD CRM — Official WhatsApp Test Verification Message';

      // 2. Dispatch via WhatsAppProvider
      const result = await whatsappProvider.send({
        userId: req.user!.id,
        recipientWhatsapp: norm.apiNumber,
        title: 'JS Investments BD CRM Test',
        message: msg,
        type: 'TEST_WHATSAPP'
      });

      if (!result.success) {
        await prisma.notificationLog.create({
          data: {
            userId: req.user!.id,
            recipientName: req.user!.name,
            recipientContact: norm.e164,
            channel: 'WHATSAPP',
            type: 'TEST_WHATSAPP',
            title: 'WhatsApp Test Dispatch',
            message: msg,
            status: result.details?.mode === 'unconfigured' ? 'NOT_CONFIGURED' : 'FAILED',
            error: result.error,
            metadataJson: JSON.stringify(result.details || {})
          }
        });

        return sendError(res, `✕ WhatsApp message failed: ${result.error}`, 400);
      }

      await prisma.notificationLog.create({
        data: {
          userId: req.user!.id,
          recipientName: req.user!.name,
          recipientContact: norm.e164,
          channel: 'WHATSAPP',
          type: 'TEST_WHATSAPP',
          title: 'WhatsApp Test Dispatch',
          message: msg,
          status: 'SENT',
          metadataJson: JSON.stringify(result.details || {})
        }
      });

      return sendSuccess(res, {
        status: 'SENT',
        providerMessageId: result.details?.providerMessageId || 'SENT',
        recipient: norm.e164,
        details: result.details
      }, `✓ WhatsApp test message sent successfully to ${norm.e164} via Meta Cloud API.`);
    } catch (err: any) {
      return sendError(res, `✕ WhatsApp test failed: ${err.message}`, 400);
    }
  }

  static async getDiagnostics(req: AuthRequest, res: Response) {
    try {
      const now = new Date();
      const todayStart = startOfDay(now);
      const sevenDaysAgo = subDays(now, 7);

      // Check DB settings
      const [dbUrl, dbKey, dbPhoneId, dbTemplate, dbResendKey, dbSmtpHost, dbSmtpUser] = await Promise.all([
        prisma.setting.findUnique({ where: { key: 'whatsapp_api_url' } }),
        prisma.setting.findUnique({ where: { key: 'whatsapp_api_key' } }),
        prisma.setting.findUnique({ where: { key: 'whatsapp_phone_number_id' } }),
        prisma.setting.findUnique({ where: { key: 'whatsapp_template_name' } }),
        prisma.setting.findUnique({ where: { key: 'resend_api_key' } }),
        prisma.setting.findUnique({ where: { key: 'smtp_host' } }),
        prisma.setting.findUnique({ where: { key: 'smtp_user' } })
      ]);

      const waApiKey = dbKey?.value || config.whatsapp.apiKey;
      const waPhoneId = dbPhoneId?.value || config.whatsapp.phoneNumberId;
      const waApiUrl = dbUrl?.value || config.whatsapp.apiUrl || 'https://graph.facebook.com/v19.0';
      const waTemplate = dbTemplate?.value || config.whatsapp.templateName;

      const whatsappConfigured = Boolean(waApiKey && waPhoneId);
      const emailConfigured = Boolean(dbResendKey?.value || process.env.RESEND_API_KEY || (dbSmtpHost?.value && dbSmtpUser?.value) || (config.email.host && config.email.user));

      // Scheduler stats
      const schedulerStats = reminderScheduler.getStats();

      // Reminder table metrics
      const [
        pendingRemindersCount,
        sentTodayCount,
        failedTodayCount,
        totalRemindersCount,
        lastSuccessfulLog,
        lastFailedLog
      ] = await Promise.all([
        prisma.meetingReminder.count({ where: { status: 'SCHEDULED' } }),
        prisma.meetingReminder.count({ where: { status: 'SENT', updatedAt: { gte: todayStart } } }),
        prisma.meetingReminder.count({ where: { status: 'FAILED', updatedAt: { gte: todayStart } } }),
        prisma.meetingReminder.count(),
        prisma.notificationLog.findFirst({
          where: { channel: 'WHATSAPP', status: 'SENT' },
          orderBy: { sentAt: 'desc' }
        }),
        prisma.notificationLog.findFirst({
          where: { channel: 'WHATSAPP', status: { in: ['FAILED', 'NOT_CONFIGURED'] } },
          orderBy: { sentAt: 'desc' }
        })
      ]);

      return sendSuccess(res, {
        system: {
          name: 'JS Investments – Business Development CRM',
          environment: config.nodeEnv,
          timezone: config.appTimezone,
          serverTimeUtc: now.toISOString(),
          serverTimePkt: new Intl.DateTimeFormat('en-US', { timeZone: config.appTimezone, dateStyle: 'full', timeStyle: 'long' }).format(now)
        },
        scheduler: {
          isRunning: schedulerStats.isRunning,
          status: 'RUNNING',
          lastRunAt: schedulerStats.lastRunAt,
          lastSuccessAt: schedulerStats.lastSuccessAt || lastSuccessfulLog?.sentAt || null,
          lastFailureAt: schedulerStats.lastFailureAt || lastFailedLog?.sentAt || null
        },
        whatsapp: {
          configured: whatsappConfigured,
          status: whatsappConfigured ? 'CONNECTED' : 'NOT_CONFIGURED',
          apiUrl: waApiUrl,
          phoneNumberId: waPhoneId ? `${waPhoneId.slice(0, 4)}••••${waPhoneId.slice(-4)}` : null,
          hasApiKey: Boolean(waApiKey),
          templateName: waTemplate || null,
          missingFields: [
            !waPhoneId ? 'Phone Number ID' : null,
            !waApiKey ? 'API Access Token' : null
          ].filter(Boolean)
        },
        email: {
          configured: emailConfigured,
          status: emailConfigured ? 'CONNECTED' : 'NOT_CONFIGURED',
          transport: dbResendKey?.value || process.env.RESEND_API_KEY ? 'RESEND_HTTPS' : (dbSmtpHost?.value || config.email.host ? 'SMTP' : 'NONE')
        },
        metrics: {
          pendingRemindersCount,
          sentTodayCount,
          failedTodayCount,
          totalRemindersCount,
          lastSuccessfulWhatsApp: lastSuccessfulLog?.sentAt || null,
          lastFailedWhatsApp: lastFailedLog?.sentAt || null,
          lastFailedReason: lastFailedLog?.error || null
        }
      }, 'System health diagnostics retrieved');
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getReminderLogs(req: AuthRequest, res: Response) {
    try {
      const { page = '1', limit = '50', status, timeframe, channel } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (status && status !== 'ALL') where.status = status;
      if (channel && channel !== 'ALL') where.channel = channel;

      if (timeframe === 'TODAY') {
        where.scheduledTime = { gte: startOfDay(new Date()) };
      } else if (timeframe === 'WEEK') {
        where.scheduledTime = { gte: subDays(new Date(), 7) };
      }

      const [total, reminders] = await Promise.all([
        prisma.meetingReminder.count({ where }),
        prisma.meetingReminder.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { scheduledTime: 'desc' },
          include: {
            meeting: {
              include: {
                client: { include: { company: true, primaryContact: true } },
                assignedUser: { select: { id: true, name: true, email: true, whatsappNumber: true, phone: true } }
              }
            }
          }
        })
      ]);

      return sendSuccess(res, reminders, 'Meeting reminder logs retrieved', 200, {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getNotificationLogs(req: AuthRequest, res: Response) {
    try {
      const { page = '1', limit = '50', channel, status } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (channel && channel !== 'ALL') where.channel = channel;
      if (status && status !== 'ALL') where.status = status;

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
