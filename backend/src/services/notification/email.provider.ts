import nodemailer from 'nodemailer';
import { INotificationProvider, NotificationPayload } from './types';
import { config } from '../../config';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';

export class EmailProvider implements INotificationProvider {
  name = 'EMAIL';

  async send(payload: NotificationPayload) {
    if (!payload.recipientEmail) {
      return { success: false, channel: this.name, error: 'Recipient email not provided' };
    }

    // Dynamic settings check from Database
    const [dbResendKey, dbHost, dbPort, dbUser, dbPass, dbSender, dbSenderName] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'resend_api_key' } }),
      prisma.setting.findUnique({ where: { key: 'smtp_host' } }),
      prisma.setting.findUnique({ where: { key: 'smtp_port' } }),
      prisma.setting.findUnique({ where: { key: 'smtp_user' } }),
      prisma.setting.findUnique({ where: { key: 'smtp_password' } }),
      prisma.setting.findUnique({ where: { key: 'smtp_sender_email' } }),
      prisma.setting.findUnique({ where: { key: 'smtp_sender_name' } })
    ]);

    const resendApiKey = dbResendKey?.value || process.env.RESEND_API_KEY;
    const host = dbHost?.value || config.email.host;
    const port = parseInt(dbPort?.value || `${config.email.port}`, 10);
    const user = dbUser?.value || config.email.user;
    const pass = dbPass?.value || config.email.password;
    const sender = dbSender?.value || config.email.from || 'onboarding@resend.dev';
    const senderName = dbSenderName?.value || 'BizDev CRM';

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #0c8ee9; padding: 24px; color: white;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 600;">${payload.title}</h2>
          <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">Business Development CRM Notification</p>
        </div>
        <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
          <p style="font-size: 15px; margin-top: 0;">${payload.message.replace(/\n/g, '<br/>')}</p>
          ${payload.metadata?.detailsHtml || ''}
          <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 6px; font-size: 13px; color: #64748b;">
            <strong>Scheduled in BizDev CRM</strong> &bull; Please check your dashboard for full details.
          </div>
        </div>
      </div>
    `;

    // MODE 1: Resend HTTPS API (Port 443 - 100% Reliable on Render)
    if (resendApiKey) {
      try {
        const fromEmail = sender.includes('@') ? sender : 'onboarding@resend.dev';
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: `${senderName} <${fromEmail}>`,
            to: [payload.recipientEmail],
            subject: payload.title,
            html: htmlContent,
            text: payload.message
          })
        });

        const resData: any = await res.json();
        if (!res.ok) {
          throw new Error(resData.message || resData.error?.message || 'Resend API delivery failed');
        }

        logger.info(`[RESEND HTTPS API] Delivered email to ${payload.recipientEmail} (ID: ${resData.id})`);
        return { success: true, channel: this.name, details: { messageId: resData.id } };
      } catch (err: any) {
        logger.error('Resend API error:', err);
        return { success: false, channel: this.name, error: err.message };
      }
    }

    // MODE 2: Traditional SMTP
    if (host && user && pass) {
      try {
        let transportOptions: any = {
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 12000
        };

        if (host.includes('gmail.com') || (user && user.includes('@gmail.com'))) {
          transportOptions = {
            service: 'gmail',
            auth: { user, pass },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 12000
          };
        }

        const transporter = nodemailer.createTransport(transportOptions);
        const info = await transporter.sendMail({
          from: `"${senderName}" <${sender}>`,
          to: payload.recipientEmail,
          subject: payload.title,
          text: payload.message,
          html: htmlContent
        });
        return { success: true, channel: this.name, details: { messageId: info.messageId } };
      } catch (err: any) {
        logger.error('SMTP error:', err);
        return { success: false, channel: this.name, error: err.message };
      }
    }

    logger.info(`[EMAIL PROVIDER (Zero-Cost Mode)] To: ${payload.recipientEmail} | Subject: ${payload.title}`);
    return { success: true, channel: this.name, details: { mode: 'simulated_zero_cost_log' } };
  }
}

export const emailProvider = new EmailProvider();

