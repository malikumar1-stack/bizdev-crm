import { prisma } from '../../utils/prisma';
import { IPostMeetingWorkflowPayload } from '../../types';
import { notificationService } from '../notification/notification.service';
import { logger } from '../../utils/logger';

export class MeetingWorkflowService {
  /**
   * Executes the critical post-meeting workflow:
   * 1. Marks current meeting as COMPLETED + stores notes, outcome, nextAction.
   * 2. Automatically provisions Next Meeting + schedules reminders if requested.
   * 3. Automatically provisions Next Follow-up + schedules reminders if requested.
   * 4. Auto-creates a Task if requested.
   * 5. Updates Client relationshipStatus & lastContactDate.
   * 6. Creates Activity timeline entry.
   * 7. Emits confirmation notifications.
   */
  async completeMeetingWorkflow(payload: IPostMeetingWorkflowPayload, currentUserId: string) {
    const { meetingId, outcome, notes, nextAction, nextFollowupDate, nextFollowupTime, nextFollowupType, nextFollowupPriority, nextMeetingDate, nextMeetingStartTime, nextMeetingEndTime, nextMeetingType, nextMeetingTitle, assignedUserId, createTask } = payload;

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

    // 1. Update the Current Meeting
    const updatedMeeting = await prisma.meeting.update({
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

    // 2. Create Next Meeting (if provided)
    let newMeeting = null;
    if (nextMeetingDate) {
      const mDate = new Date(nextMeetingDate);
      let sTime = new Date(mDate);
      let eTime = new Date(mDate);

      if (nextMeetingStartTime) {
        const [hours, mins] = nextMeetingStartTime.split(':').map(Number);
        sTime.setHours(hours, mins, 0, 0);
      } else {
        sTime.setHours(11, 0, 0, 0);
      }

      if (nextMeetingEndTime) {
        const [hours, mins] = nextMeetingEndTime.split(':').map(Number);
        eTime.setHours(hours, mins, 0, 0);
      } else {
        eTime.setHours(12, 0, 0, 0);
      }

      newMeeting = await prisma.meeting.create({
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

    // 3. Create Next Follow-up (if provided)
    let newFollowup = null;
    if (nextFollowupDate) {
      const fuDate = new Date(nextFollowupDate);
      newFollowup = await prisma.followup.create({
        data: {
          clientId,
          meetingId: currentMeeting.id,
          title: nextAction || `Follow-up with ${currentMeeting.client.company.name}`,
          description: `Post-meeting action item: ${nextAction || notes.slice(0, 100)}`,
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

    // 4. Create Task (if requested)
    let newTask = null;
    if (createTask && nextAction) {
      newTask = await prisma.task.create({
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

    // 5. Update Client Status & Dates
    let newStatus = currentMeeting.client.relationshipStatus;
    if (outcome === 'PROPOSAL_REQUESTED') newStatus = 'FOLLOWUP_REQUIRED';
    else if (outcome === 'POSITIVE') newStatus = 'NEGOTIATION';
    else if (outcome === 'CLOSED') newStatus = 'ACTIVE_CLIENT';
    else if (outcome === 'NEGATIVE') newStatus = 'LOST';
    else newStatus = 'MEETING_COMPLETED';

    await prisma.client.update({
      where: { id: clientId },
      data: {
        relationshipStatus: newStatus,
        lastContactDate: now,
        nextMeetingDate: newMeeting ? newMeeting.startTime : null,
        nextFollowupDate: newFollowup ? newFollowup.dueDate : null
      }
    });

    // 6. Append Activity Log
    await prisma.activity.create({
      data: {
        clientId,
        userId: currentUserId,
        type: 'MEETING_COMPLETED',
        title: `Meeting Completed: ${currentMeeting.title}`,
        description: `Outcome: ${outcome}. Notes: ${notes.slice(0, 150)}...`,
        metadataJson: JSON.stringify({
          outcome,
          nextAction,
          nextMeetingId: newMeeting?.id,
          nextFollowupId: newFollowup?.id
        })
      }
    });

    // 7. Send In-App & Email Notification
    await notificationService.send({
      userId: assignedUser,
      title: `Meeting Completed: ${currentMeeting.client.company.name}`,
      message: `Meeting marked completed. Outcome: ${outcome}.\nNext Action: ${nextAction || 'None'}\nNext Follow-up: ${nextFollowupDate ? new Date(nextFollowupDate).toLocaleDateString() : 'N/A'}`,
      type: 'SYSTEM',
      entityType: 'MEETING',
      entityId: meetingId
    });

    logger.info(`Post-meeting workflow executed successfully for meeting: ${meetingId}`);

    return {
      meeting: updatedMeeting,
      nextMeeting: newMeeting,
      nextFollowup: newFollowup,
      task: newTask
    };
  }
}

export const meetingWorkflowService = new MeetingWorkflowService();
