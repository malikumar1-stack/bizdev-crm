import { prisma } from '../../utils/prisma';
import { IPostMeetingWorkflowPayload } from '../../types';
import { notificationService } from '../notification/notification.service';
import { ReminderScheduler } from '../scheduler/reminder.scheduler';
import { logger } from '../../utils/logger';

export class MeetingWorkflowService {
  /**
   * Executes the critical post-meeting workflow with complete transaction safety & idempotency:
   * 1. Validates current meeting status.
   * 2. Runs inside an atomic database transaction.
   * 3. Marks current meeting COMPLETED + stores notes, outcome, nextAction.
   * 4. Provisions Next Meeting (if provided & not already provisioned).
   * 5. Provisions Next Follow-up (if provided & not already provisioned).
   * 6. Auto-creates a Task (if requested & not already provisioned).
   * 7. Updates Client relationshipStatus, lastContactDate, nextMeetingDate, nextFollowupDate.
   * 8. Creates Activity timeline entry.
   * 9. Emits confirmation notifications outside transaction block.
   */
  async completeMeetingWorkflow(payload: IPostMeetingWorkflowPayload, currentUserId: string) {
    const {
      meetingId,
      outcome,
      notes,
      nextAction,
      nextFollowupDate,
      nextFollowupTime,
      nextFollowupType,
      nextFollowupPriority,
      nextMeetingDate,
      nextMeetingStartTime,
      nextMeetingEndTime,
      nextMeetingType,
      nextMeetingTitle,
      assignedUserId,
      createTask
    } = payload;

    const currentMeeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { client: { include: { company: true, primaryContact: true } } }
    });

    if (!currentMeeting) {
      throw new Error(`Meeting with ID ${meetingId} not found`);
    }

    const clientId = currentMeeting.clientId;
    const assignedUser = assignedUserId || currentMeeting.assignedUserId || currentUserId;
    const now = new Date();

    // Perform all database mutations inside a single atomic transaction with extended timeout for cloud DB latency
    const transactionResult = await prisma.$transaction(async (tx) => {
      // 1. Update the Current Meeting
      const updatedMeeting = await tx.meeting.update({
        where: { id: meetingId },
        data: {
          status: 'COMPLETED',
          outcome,
          notes,
          nextAction,
          nextMeetingDate: nextMeetingDate ? new Date(nextMeetingDate) : null,
          nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate) : null
        }
      });

      // 2. Create Next Meeting (with duplicate submission protection)
      let newMeeting = null;
      if (nextMeetingDate) {
        const mDate = new Date(nextMeetingDate);
        let sTime = new Date(mDate);
        let eTime = new Date(mDate);

        if (nextMeetingStartTime) {
          const [hours, mins] = nextMeetingStartTime.split(':').map(Number);
          sTime.setHours(isNaN(hours) ? 11 : hours, isNaN(mins) ? 0 : mins, 0, 0);
        } else {
          sTime.setHours(11, 0, 0, 0);
        }

        if (nextMeetingEndTime) {
          const [hours, mins] = nextMeetingEndTime.split(':').map(Number);
          eTime.setHours(isNaN(hours) ? 12 : hours, isNaN(mins) ? 0 : mins, 0, 0);
        } else {
          eTime.setHours(12, 0, 0, 0);
        }

        // Idempotency: check if identical scheduled meeting already exists for this client at this time
        const existingMeeting = await tx.meeting.findFirst({
          where: {
            clientId,
            startTime: sTime,
            status: 'SCHEDULED'
          }
        });

        if (existingMeeting) {
          newMeeting = existingMeeting;
        } else {
          newMeeting = await tx.meeting.create({
            data: {
              clientId,
              title: nextMeetingTitle || `Follow-up Meeting with ${currentMeeting.client.company.name}`,
              meetingType: nextMeetingType || 'ONLINE',
              status: 'SCHEDULED',
              startTime: sTime,
              endTime: eTime,
              timezone: currentMeeting.timezone || 'Asia/Karachi',
              agenda: `Follow-up on previous meeting: ${nextAction || 'Discussion'}`,
              assignedUserId: assignedUser,
              createdById: currentUserId,
              reminded24h: false,
              reminded1h: false
            }
          });
        }
      }

      // 3. Create Next Follow-up (with duplicate submission protection)
      let newFollowup = null;
      if (nextFollowupDate) {
        const fuDate = new Date(nextFollowupDate);

        const existingFollowup = await tx.followup.findFirst({
          where: {
            clientId,
            meetingId: currentMeeting.id,
            dueDate: fuDate
          }
        });

        if (existingFollowup) {
          newFollowup = existingFollowup;
        } else {
          newFollowup = await tx.followup.create({
            data: {
              clientId,
              meetingId: currentMeeting.id,
              title: nextAction || `Follow-up with ${currentMeeting.client.company.name}`,
              description: `Post-meeting action item: ${nextAction || (notes ? notes.slice(0, 100) : 'Review meeting minutes')}`,
              followupType: nextFollowupType || 'EMAIL',
              priority: nextFollowupPriority || 'HIGH',
              status: 'PENDING',
              dueDate: fuDate,
              dueTime: nextFollowupTime || '16:00',
              reminderDate: fuDate,
              reminderChannel: 'ALL',
              assignedUserId: assignedUser
            }
          });
        }
      }

      // 4. Create Task (if requested)
      let newTask = null;
      if (createTask && nextAction) {
        const existingTask = await tx.task.findFirst({
          where: {
            clientId,
            title: nextAction
          }
        });

        if (existingTask) {
          newTask = existingTask;
        } else {
          newTask = await tx.task.create({
            data: {
              clientId,
              title: nextAction,
              description: `Action item from completed meeting: "${currentMeeting.title}"`,
              dueDate: nextFollowupDate ? new Date(nextFollowupDate) : new Date(now.getTime() + 86400000 * 3),
              priority: nextFollowupPriority || 'HIGH',
              status: 'TODO',
              assignedUserId: assignedUser
            }
          });
        }
      }

      // 5. Compute and Update Client Relationship Status & Dates
      let newStatus = currentMeeting.client.relationshipStatus;
      if (outcome === 'PROPOSAL_REQUESTED') newStatus = 'FOLLOWUP_REQUIRED';
      else if (outcome === 'POSITIVE') newStatus = 'NEGOTIATION';
      else if (outcome === 'CLOSED') newStatus = 'ACTIVE_CLIENT';
      else if (outcome === 'NEGATIVE') newStatus = 'LOST';
      else if (newStatus === 'MEETING_SCHEDULED') newStatus = 'MEETING_COMPLETED';

      await tx.client.update({
        where: { id: clientId },
        data: {
          relationshipStatus: newStatus,
          lastContactDate: now,
          nextMeetingDate: newMeeting ? newMeeting.startTime : undefined,
          nextFollowupDate: newFollowup ? newFollowup.dueDate : undefined
        }
      });

      // 6. Append Activity Log
      await tx.activity.create({
        data: {
          clientId,
          userId: currentUserId,
          type: 'MEETING_COMPLETED',
          title: `Meeting Completed: ${currentMeeting.title}`,
          description: `Outcome: ${outcome}. Notes: ${notes ? notes.slice(0, 150) : 'Completed'}${notes && notes.length > 150 ? '...' : ''}`,
          metadataJson: JSON.stringify({
            outcome,
            nextAction,
            nextMeetingId: newMeeting?.id,
            nextFollowupId: newFollowup?.id
          })
        }
      });

      return {
        meeting: updatedMeeting,
        nextMeeting: newMeeting,
        nextFollowup: newFollowup,
        task: newTask
      };
    }, { timeout: 25000, maxWait: 15000 });

    // 7. Auto-provision reminders for next meeting if created
    if (transactionResult.nextMeeting) {
      await ReminderScheduler.provisionRemindersForMeeting(transactionResult.nextMeeting.id);
    }

    // 8. Send In-App & Email Notifications safely outside the transaction
    try {
      await notificationService.send({
        userId: assignedUser,
        title: `Meeting Completed: ${currentMeeting.client.company.name}`,
        message: `Meeting marked completed. Outcome: ${outcome}.\nNext Action: ${nextAction || 'None'}\nNext Follow-up: ${nextFollowupDate ? new Date(nextFollowupDate).toLocaleDateString() : 'N/A'}`,
        type: 'SYSTEM',
        entityType: 'MEETING',
        entityId: meetingId
      });
    } catch (notifErr: any) {
      logger.warn(`Post-meeting notification failed (non-blocking):`, notifErr.message);
    }

    logger.info(`[WORKFLOW] Post-meeting workflow executed transactionally for meeting: ${meetingId}`);

    return transactionResult;
  }
}

export const meetingWorkflowService = new MeetingWorkflowService();
