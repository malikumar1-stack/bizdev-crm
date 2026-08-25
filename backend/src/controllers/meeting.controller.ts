import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { meetingWorkflowService } from '../services/workflow/meeting-workflow.service';
import { notificationService } from '../services/notification/notification.service';
import { AuditService } from '../services/audit/audit.service';
import { formatTimeInTz } from '../config/timezone';

export class MeetingController {
  static async getMeetings(req: AuthRequest, res: Response) {
    try {
      const { clientId, status, meetingType, assignedUserId, startDate, endDate, page = '1', limit = '50' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (clientId) where.clientId = clientId;
      if (status) where.status = status;
      if (meetingType) where.meetingType = meetingType;
      if (assignedUserId) where.assignedUserId = assignedUserId;

      if (startDate || endDate) {
        where.startTime = {};
        if (startDate) where.startTime.gte = new Date(startDate as string);
        if (endDate) where.startTime.lte = new Date(endDate as string);
      }

      const [total, meetings] = await Promise.all([
        prisma.meeting.count({ where }),
        prisma.meeting.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { startTime: 'asc' },
          include: {
            client: { include: { company: true, primaryContact: true } },
            assignedUser: { select: { id: true, name: true, email: true } },
            participants: true
          }
        })
      ]);

      return sendSuccess(res, meetings, 'Meetings retrieved', 200, { total, page: pageNum, limit: limitNum });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getMeetingById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const meeting = await prisma.meeting.findUnique({
        where: { id },
        include: {
          client: { include: { company: true, primaryContact: true } },
          assignedUser: true,
          createdByUser: true,
          participants: true,
          followups: true
        }
      });
      if (!meeting) return sendError(res, 'Meeting not found', 404);
      return sendSuccess(res, meeting);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async createMeeting(req: AuthRequest, res: Response) {
    try {
      const { clientId, title, meetingType, startTime, endTime, location, meetingLink, agenda, notes, assignedUserId, participants } = req.body;

      if (!clientId || !title || !startTime || !endTime) {
        return sendError(res, 'Client, title, start time, and end time are required', 400);
      }

      const assignedUser = assignedUserId || req.user!.id;
      const sTime = new Date(startTime);
      const eTime = new Date(endTime);

      const meeting = await prisma.meeting.create({
        data: {
          clientId,
          title,
          meetingType: meetingType || 'ONLINE',
          status: 'SCHEDULED',
          startTime: sTime,
          endTime: eTime,
          location,
          meetingLink,
          agenda,
          notes,
          assignedUserId: assignedUser,
          createdById: req.user!.id,
          reminded24h: false,
          reminded1h: false,
          participants: participants && participants.length > 0 ? {
            create: participants.map((p: any) => ({
              contactId: p.contactId || null,
              userId: p.userId || null,
              name: p.name,
              email: p.email,
              role: p.role || 'Participant'
            }))
          } : undefined
        },
        include: { client: { include: { company: true, primaryContact: true } }, assignedUser: true }
      });

      // Update Client nextMeetingDate & status
      await prisma.client.update({
        where: { id: clientId },
        data: {
          nextMeetingDate: sTime,
          relationshipStatus: 'MEETING_SCHEDULED'
        }
      });

      // Activity Log
      const formattedTime = formatTimeInTz(sTime, 'dd MMM yyyy at hh:mm a');
      await prisma.activity.create({
        data: {
          clientId,
          userId: req.user!.id,
          type: 'MEETING_SCHEDULED',
          title: `Meeting Scheduled: ${title}`,
          description: `Scheduled for ${formattedTime} with ${meeting.client.company.name}`,
          metadataJson: JSON.stringify({ meetingId: meeting.id })
        }
      });

      // In-app Notification for assigned user
      await notificationService.send({
        userId: assignedUser,
        title: `New Meeting Scheduled: ${meeting.client.company.name}`,
        message: `You have been assigned to "${title}" on ${formattedTime}.`,
        type: 'MEETING_REMINDER',
        entityType: 'MEETING',
        entityId: meeting.id
      });

      AuditService.log(req.user!.id, 'CREATE', 'MEETING', meeting.id);

      return sendSuccess(res, meeting, 'Meeting created and reminder scheduled', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async updateMeeting(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { title, meetingType, status, startTime, endTime, location, meetingLink, agenda, notes, outcome, nextAction, assignedUserId } = req.body;

      const current = await prisma.meeting.findUnique({ where: { id } });
      if (!current) return sendError(res, 'Meeting not found', 404);

      const updated = await prisma.meeting.update({
        where: { id },
        data: {
          title,
          meetingType,
          status,
          startTime: startTime ? new Date(startTime) : undefined,
          endTime: endTime ? new Date(endTime) : undefined,
          location,
          meetingLink,
          agenda,
          notes,
          outcome,
          nextAction,
          assignedUserId
        },
        include: { client: { include: { company: true } }, assignedUser: true }
      });

      AuditService.log(req.user!.id, 'UPDATE', 'MEETING', id, { previous: current, updated });

      return sendSuccess(res, updated, 'Meeting updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async completeWorkflow(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const result = await meetingWorkflowService.completeMeetingWorkflow(
        { ...req.body, meetingId: id },
        req.user!.id
      );
      return sendSuccess(res, result, 'Post-meeting workflow executed successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async deleteMeeting(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await prisma.meeting.delete({ where: { id } });
      AuditService.log(req.user!.id, 'DELETE', 'MEETING', id);
      return sendSuccess(res, null, 'Meeting deleted successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
