import cron from 'node-cron';
import { subHours, addHours, addMinutes } from 'date-fns';
import { prisma } from '../../utils/prisma';
import { whatsappProvider } from '../notification/whatsapp.provider';
import { emailProvider } from '../notification/email.provider';
import { notificationService } from '../notification/notification.service';
import { formatTimeInTz } from '../../config/timezone';
import { logger } from '../../utils/logger';
import { normalizePhoneNumber } from '../../utils/phone.util';

export class ReminderScheduler {
  private isRunning: boolean = false;
  private lastRunAt: Date | null = null;
  private lastSuccessAt: Date | null = null;
  private lastFailureAt: Date | null = null;

  start() {
    logger.info('[SCHEDULER] Starting JS Investments Background Reminder Scheduler (Runs every minute with boot recovery)...');

    // 1. Immediate boot catch-up scan for missed reminders during container sleep/restart
    this.checkAndSendReminders().catch((err) => {
      logger.error('[SCHEDULER] Startup reminder recovery scan failed:', err);
    });

    // 2. Schedule regular recurring scan every minute
    cron.schedule('* * * * *', async () => {
      await this.checkAndSendReminders();
    });
  }

  getStats() {
    return {
      isRunning: this.isRunning,
      lastRunAt: this.lastRunAt,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt
    };
  }

  /**
   * Auto-provisions 24h and 1h MeetingReminder records for a scheduled meeting
   */
  static async provisionRemindersForMeeting(meetingId: string) {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          client: { include: { company: true, primaryContact: true } },
          assignedUser: true
        }
      });

      if (!meeting || meeting.status !== 'SCHEDULED') return;

      const startTime = new Date(meeting.startTime);
      const scheduled24h = subHours(startTime, 24);
      const scheduled1h = subHours(startTime, 1);

      const assignedUser = meeting.assignedUser;
      const rawUserPhone = assignedUser?.whatsappNumber || assignedUser?.whatsapp || assignedUser?.phone;
      const userNormPhone = normalizePhoneNumber(rawUserPhone);

      // Provision 24-Hour WhatsApp Reminder for Assigned BD Executive
      if (userNormPhone.isValid) {
        const existing24h = await prisma.meetingReminder.findFirst({
          where: { meetingId, reminderType: '24H', channel: 'WHATSAPP' }
        });

        if (!existing24h) {
          await prisma.meetingReminder.create({
            data: {
              meetingId,
              reminderType: '24H',
              channel: 'WHATSAPP',
              recipientType: 'ASSIGNED_USER',
              recipientName: assignedUser?.name || 'BD Manager',
              recipientContact: userNormPhone.e164,
              scheduledTime: scheduled24h,
              status: 'SCHEDULED'
            }
          });
        } else if (existing24h.status === 'SCHEDULED') {
          await prisma.meetingReminder.update({
            where: { id: existing24h.id },
            data: {
              scheduledTime: scheduled24h,
              recipientContact: userNormPhone.e164
            }
          });
        }

        // Provision 1-Hour WhatsApp Reminder for Assigned BD Executive
        const existing1h = await prisma.meetingReminder.findFirst({
          where: { meetingId, reminderType: '1H', channel: 'WHATSAPP' }
        });

        if (!existing1h) {
          await prisma.meetingReminder.create({
            data: {
              meetingId,
              reminderType: '1H',
              channel: 'WHATSAPP',
              recipientType: 'ASSIGNED_USER',
              recipientName: assignedUser?.name || 'BD Manager',
              recipientContact: userNormPhone.e164,
              scheduledTime: scheduled1h,
              status: 'SCHEDULED'
            }
          });
        } else if (existing1h.status === 'SCHEDULED') {
          await prisma.meetingReminder.update({
            where: { id: existing1h.id },
            data: {
              scheduledTime: scheduled1h,
              recipientContact: userNormPhone.e164
            }
          });
        }
      }
    } catch (err) {
      logger.error(`[SCHEDULER] Failed to provision reminders for meeting ${meetingId}:`, err);
    }
  }

  /**
   * Main scan function: processes all due reminders with atomic locking and idempotency
   */
  async checkAndSendReminders() {
    if (this.isRunning) {
      logger.debug('[SCHEDULER] Previous scan still active, skipping tick');
      return;
    }

    this.isRunning = true;
    this.lastRunAt = new Date();

    try {
      const now = new Date();

      // ========================================================================
      // 1. Process Due MeetingReminders from MeetingReminder Table
      // ========================================================================
      const dueReminders = await prisma.meetingReminder.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledTime: { lte: now }
        },
        include: {
          meeting: {
            include: {
              client: { include: { company: true, primaryContact: true } },
              assignedUser: true
            }
          }
        }
      });

      for (const reminder of dueReminders) {
        const meeting = reminder.meeting;

        // If meeting is cancelled or completed, cancel the reminder
        if (!meeting || meeting.status !== 'SCHEDULED') {
          await prisma.meetingReminder.update({
            where: { id: reminder.id },
            data: { status: 'CANCELLED' }
          });
          continue;
        }

        // Atomic Status Locking to prevent race conditions / duplicate sends
        const locked = await prisma.meetingReminder.updateMany({
          where: { id: reminder.id, status: 'SCHEDULED' },
          data: {
            status: 'PROCESSING',
            attemptedAt: now,
            attemptsCount: { increment: 1 }
          }
        });

        if (locked.count === 0) continue; // Already picked up

        const companyName = meeting.client.company.name;
        const contactName = meeting.client.primaryContact?.name || 'Key Stakeholder';
        const formattedDate = formatTimeInTz(meeting.startTime, 'dd MMMM yyyy');
        const formattedTime = formatTimeInTz(meeting.startTime, 'hh:mm a');
        const location = meeting.location || meeting.meetingLink || 'Office / Online';
        const agenda = meeting.agenda || 'Business Development & Investment Discussion';

        let title = '';
        let messageText = '';

        if (reminder.reminderType === '24H') {
          title = `Meeting Reminder: Tomorrow at ${formattedTime} — ${companyName}`;
          messageText = `JS Investments BD CRM\n\nMeeting Scheduled Tomorrow\nClient: ${companyName}\nContact: ${contactName}\nDate: ${formattedDate}\nTime: ${formattedTime} PKT\nLocation: ${location}\nAgenda: ${agenda}\n\nPlease review client notes prior to the meeting.`;
        } else if (reminder.reminderType === '1H') {
          title = `Starting in 1 Hour: ${companyName} Meeting`;
          messageText = `JS Investments BD CRM\n\nUrgent: Meeting Starts at ${formattedTime} PKT\nClient: ${companyName}\nContact: ${contactName}\nLocation: ${location}\n\nPlease join on time.`;
        } else {
          title = `Meeting Notice: ${companyName}`;
          messageText = `JS Investments BD CRM\n\nMeeting with ${companyName} at ${formattedTime} PKT. Location: ${location}`;
        }

        // Dispatch via WhatsApp Provider
        if (reminder.channel === 'WHATSAPP') {
          const sendRes = await whatsappProvider.send({
            userId: meeting.assignedUserId || undefined,
            recipientWhatsapp: reminder.recipientContact,
            title,
            message: messageText,
            type: 'MEETING_REMINDER',
            entityType: 'MEETING',
            entityId: meeting.id
          });

          if (sendRes.success) {
            this.lastSuccessAt = new Date();
            await prisma.meetingReminder.update({
              where: { id: reminder.id },
              data: {
                status: 'SENT',
                providerMessageId: sendRes.details?.providerMessageId || 'SENT',
                providerResponse: JSON.stringify(sendRes.details || {}),
                errorMessage: null
              }
            });

            // Update boolean flags on Meeting
            if (reminder.reminderType === '24H') {
              await prisma.meeting.update({ where: { id: meeting.id }, data: { reminded24h: true } });
            } else if (reminder.reminderType === '1H') {
              await prisma.meeting.update({ where: { id: meeting.id }, data: { reminded1h: true } });
            }

            logger.info(`[SCHEDULER] ✓ WhatsApp reminder (${reminder.reminderType}) SENT for meeting: ${meeting.title} (${companyName}) to ${reminder.recipientContact}`);
          } else {
            this.lastFailureAt = new Date();
            await prisma.meetingReminder.update({
              where: { id: reminder.id },
              data: {
                status: 'FAILED',
                errorMessage: sendRes.error || 'WhatsApp dispatch failed',
                providerResponse: JSON.stringify(sendRes.details || {})
              }
            });

            logger.error(`[SCHEDULER] ✕ WhatsApp reminder (${reminder.reminderType}) FAILED for meeting: ${meeting.title}. Reason: ${sendRes.error}`);
          }
        }
      }

      // ========================================================================
      // 2. Legacy / Direct Scan for Meetings without MeetingReminder records
      // ========================================================================
      const in36Hours = addHours(now, 36);
      const in90Minutes = addMinutes(now, 90);

      // 24H scan fallback
      const meetings24h = await prisma.meeting.findMany({
        where: {
          status: 'SCHEDULED',
          reminded24h: false,
          startTime: { gte: now, lte: in36Hours }
        },
        include: {
          client: { include: { company: true, primaryContact: true } },
          assignedUser: true,
          reminders: true
        }
      });

      for (const m of meetings24h) {
        // If MeetingReminder table already has it or already sent, skip
        const has24hReminder = m.reminders?.some(r => r.reminderType === '24H');
        if (has24hReminder) continue;

        // Auto-provision so next tick handles with atomic state
        await ReminderScheduler.provisionRemindersForMeeting(m.id);
      }

      // 1H scan fallback
      const meetings1h = await prisma.meeting.findMany({
        where: {
          status: 'SCHEDULED',
          reminded1h: false,
          startTime: { gte: now, lte: in90Minutes }
        },
        include: {
          client: { include: { company: true, primaryContact: true } },
          assignedUser: true,
          reminders: true
        }
      });

      for (const m of meetings1h) {
        const has1hReminder = m.reminders?.some(r => r.reminderType === '1H');
        if (has1hReminder) continue;
        await ReminderScheduler.provisionRemindersForMeeting(m.id);
      }

      // ========================================================================
      // 3. Scan & Update Overdue Follow-ups
      // ========================================================================
      await prisma.followup.updateMany({
        where: {
          status: 'PENDING',
          dueDate: { lt: now }
        },
        data: { status: 'OVERDUE' }
      });

      // Send reminders for pending follow-ups due today
      const pendingFollowups = await prisma.followup.findMany({
        where: {
          status: { in: ['PENDING', 'OVERDUE'] },
          reminded: false,
          dueDate: { lte: now }
        },
        include: {
          client: { include: { company: true } },
          assignedUser: true
        }
      });

      for (const fu of pendingFollowups) {
        if (fu.assignedUserId) {
          await notificationService.send({
            userId: fu.assignedUserId,
            title: `Follow-up Due: ${fu.client.company.name}`,
            message: `Follow-up task "${fu.title}" is due.\nType: ${fu.followupType}, Priority: ${fu.priority}.`,
            type: 'FOLLOWUP_REMINDER',
            entityType: 'FOLLOWUP',
            entityId: fu.id
          });

          await prisma.followup.update({
            where: { id: fu.id },
            data: { reminded: true }
          });
        }
      }
    } catch (err) {
      logger.error('[SCHEDULER] Error during reminder scheduler execution:', err);
    } finally {
      this.isRunning = false;
    }
  }
}

export const reminderScheduler = new ReminderScheduler();
