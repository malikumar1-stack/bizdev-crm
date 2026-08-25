import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { reminderScheduler } from '../services/scheduler/reminder.scheduler';

export class NotificationController {
  static async getNotifications(req: AuthRequest, res: Response) {
    try {
      const { unreadOnly, limit = '30' } = req.query;
      const where: any = { userId: req.user!.id };
      if (unreadOnly === 'true') where.read = false;

      const [notifications, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          take: parseInt(limit as string, 10),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.notification.count({
          where: { userId: req.user!.id, read: false }
        })
      ]);

      return sendSuccess(res, { notifications, unreadCount });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async markAsRead(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await prisma.notification.update({
        where: { id },
        data: { read: true }
      });
      return sendSuccess(res, null, 'Marked as read');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.user!.id, read: false },
        data: { read: true }
      });
      return sendSuccess(res, null, 'All notifications marked as read');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getPreferences(req: AuthRequest, res: Response) {
    try {
      let pref = await prisma.notificationPreference.findUnique({
        where: { userId: req.user!.id }
      });
      if (!pref) {
        pref = await prisma.notificationPreference.create({
          data: { userId: req.user!.id }
        });
      }
      return sendSuccess(res, pref);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async updatePreferences(req: AuthRequest, res: Response) {
    try {
      const { emailEnabled, whatsappEnabled, browserEnabled, inAppEnabled, meetingReminderLeadHours, followupReminderLeadHours } = req.body;
      const pref = await prisma.notificationPreference.upsert({
        where: { userId: req.user!.id },
        update: { emailEnabled, whatsappEnabled, browserEnabled, inAppEnabled, meetingReminderLeadHours, followupReminderLeadHours },
        create: { userId: req.user!.id, emailEnabled, whatsappEnabled, browserEnabled, inAppEnabled, meetingReminderLeadHours, followupReminderLeadHours }
      });
      return sendSuccess(res, pref, 'Preferences updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async triggerScheduler(req: AuthRequest, res: Response) {
    try {
      await reminderScheduler.checkAndSendReminders();
      return sendSuccess(res, null, 'Background reminder scheduler executed manually');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
