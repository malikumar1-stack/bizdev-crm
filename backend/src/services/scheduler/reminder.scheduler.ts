import cron from 'node-cron';
import { addHours, isBefore, addMinutes } from 'date-fns';
import { prisma } from '../../utils/prisma';
import { notificationService } from '../notification/notification.service';
import { formatTimeInTz } from '../../config/timezone';
import { logger } from '../../utils/logger';

export class ReminderScheduler {
  private isRunning: boolean = false;

  start() {
    logger.info('Starting Background Reminder Scheduler (Runs every minute with boot recovery)...');

    // 1. Immediate boot catch-up scan for missed reminders during container sleep/restart
    this.checkAndSendReminders().catch((err) => {
      logger.error('Startup reminder recovery scan failed:', err);
    });

    // 2. Schedule regular recurring scan every minute
    cron.schedule('* * * * *', async () => {
      await this.checkAndSendReminders();
    });
  }

  async checkAndSendReminders() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const now = new Date();
      const in36Hours = addHours(now, 36);
      const in90Minutes = addMinutes(now, 90);

      // ========================================================================
      // 1. Check 24-Hour Meeting Reminders
      // ========================================================================
      const meetings24h = await prisma.meeting.findMany({
        where: {
          status: 'SCHEDULED',
          reminded24h: false,
          startTime: {
            gte: now,
            lte: in36Hours
          }
        },
        include: {
          client: {
            include: { company: true, primaryContact: true }
          },
          assignedUser: true
        }
      });

      for (const meeting of meetings24h) {
        const timeUntilMeetingMs = new Date(meeting.startTime).getTime() - now.getTime();
        const hoursUntilMeeting = timeUntilMeetingMs / (1000 * 60 * 60);

        // If meeting is already starting in less than 2 hours, mark 24h reminder as skipped/true
        // and let the 1h reminder deliver the urgent notification without duplicate spam
        if (hoursUntilMeeting <= 2) {
          await prisma.meeting.update({
            where: { id: meeting.id },
            data: { reminded24h: true }
          });
          continue;
        }

        if (meeting.assignedUserId) {
          const formattedDate = formatTimeInTz(meeting.startTime, 'dd MMMM yyyy');
          const formattedTime = formatTimeInTz(meeting.startTime, 'hh:mm a');
          const companyName = meeting.client.company.name;
          const contactName = meeting.client.primaryContact?.name || 'Key Stakeholder';
          const userName = meeting.assignedUser?.name?.split(' ')[0] || 'Team Member';
          const location = meeting.location || meeting.meetingLink || 'Online Conference';

          const emailMessage = `Hello ${userName},\n\nThis is a reminder that you have a client meeting tomorrow.\n\nClient:\n${companyName}\n\nContact:\n${contactName}\n\nDate:\n${formattedDate}\n\nTime:\n${formattedTime}\n\nLocation:\n${location}\n\nAgenda:\n${meeting.agenda || 'General Business Development Discussion'}\n\nPlease review the client profile and previous meeting notes before the meeting.`;

          await notificationService.send({
            userId: meeting.assignedUserId,
            title: `Reminder: Client Meeting Tomorrow — ${companyName}`,
            message: emailMessage,
            type: 'MEETING_REMINDER',
            entityType: 'MEETING',
            entityId: meeting.id,
            metadata: {
              detailsHtml: `
                <div style="background: #f1f5f9; padding: 14px 18px; border-radius: 8px; margin: 16px 0; border: 1px solid #e2e8f0;">
                  <p style="margin: 4px 0;"><strong>Client:</strong> ${companyName}</p>
                  <p style="margin: 4px 0;"><strong>Contact:</strong> ${contactName}</p>
                  <p style="margin: 4px 0;"><strong>Date:</strong> ${formattedDate}</p>
                  <p style="margin: 4px 0;"><strong>Time:</strong> ${formattedTime}</p>
                  <p style="margin: 4px 0;"><strong>Location:</strong> ${location}</p>
                  <p style="margin: 4px 0;"><strong>Agenda:</strong> ${meeting.agenda || 'N/A'}</p>
                </div>
              `
            }
          });

          await prisma.meeting.update({
            where: { id: meeting.id },
            data: { reminded24h: true }
          });
          logger.info(`[SCHEDULER] 24h reminder sent for meeting: ${meeting.title} (${companyName})`);
        }
      }

      // ========================================================================
      // 2. Check 1-Hour Meeting Reminders
      // ========================================================================
      const meetings1h = await prisma.meeting.findMany({
        where: {
          status: 'SCHEDULED',
          reminded1h: false,
          startTime: {
            gte: now,
            lte: in90Minutes
          }
        },
        include: {
          client: {
            include: { company: true, primaryContact: true }
          },
          assignedUser: true
        }
      });

      for (const meeting of meetings1h) {
        if (meeting.assignedUserId) {
          const formattedTime = formatTimeInTz(meeting.startTime, 'hh:mm a');
          const companyName = meeting.client.company.name;
          const contactName = meeting.client.primaryContact?.name || 'Client';

          await notificationService.send({
            userId: meeting.assignedUserId,
            title: `Starting Soon: ${companyName} Meeting`,
            message: `Your meeting "${meeting.title}" with ${companyName} (${contactName}) starts at ${formattedTime}.\nLocation/Link: ${meeting.location || meeting.meetingLink || 'Online'}`,
            type: 'MEETING_REMINDER',
            entityType: 'MEETING',
            entityId: meeting.id
          });

          await prisma.meeting.update({
            where: { id: meeting.id },
            data: { reminded1h: true }
          });
          logger.info(`[SCHEDULER] 1h reminder sent for meeting: ${meeting.title} (${companyName})`);
        }
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

      // Send pending reminders for follow-ups due today
      const pendingFollowups = await prisma.followup.findMany({
        where: {
          status: { in: ['PENDING', 'OVERDUE'] },
          reminded: false,
          dueDate: { lte: now }
        },
        include: {
          client: { include: { company: true } }
        }
      });

      for (const fu of pendingFollowups) {
        if (fu.assignedUserId) {
          await notificationService.send({
            userId: fu.assignedUserId,
            title: `Follow-up Due: ${fu.client.company.name}`,
            message: `Follow-up task "${fu.title}" is due. Type: ${fu.followupType}, Priority: ${fu.priority}.`,
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
      logger.error('Error during reminder scheduler execution:', err);
    } finally {
      this.isRunning = false;
    }
  }
}

export const reminderScheduler = new ReminderScheduler();
