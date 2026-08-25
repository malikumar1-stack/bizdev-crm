import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification/notification.service';
import { AuditService } from '../services/audit/audit.service';

export class FollowupController {
  static async getFollowups(req: AuthRequest, res: Response) {
    try {
      const { clientId, status, followupType, priority, assignedUserId, page = '1', limit = '50' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (clientId) where.clientId = clientId;
      if (status) where.status = status;
      if (followupType) where.followupType = followupType;
      if (priority) where.priority = priority;
      if (assignedUserId) where.assignedUserId = assignedUserId;

      const [total, followups] = await Promise.all([
        prisma.followup.count({ where }),
        prisma.followup.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { dueDate: 'asc' },
          include: {
            client: { include: { company: true, primaryContact: true } },
            assignedUser: { select: { id: true, name: true, email: true } },
            meeting: { select: { id: true, title: true } }
          }
        })
      ]);

      return sendSuccess(res, followups, 'Follow-ups retrieved', 200, { total, page: pageNum, limit: limitNum });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async createFollowup(req: AuthRequest, res: Response) {
    try {
      const { clientId, meetingId, title, description, followupType, priority, dueDate, dueTime, reminderDate, reminderChannel, assignedUserId } = req.body;

      if (!clientId || !title || !dueDate) {
        return sendError(res, 'Client, title, and due date are required', 400);
      }

      const assignedUser = assignedUserId || req.user!.id;
      const fuDate = new Date(dueDate);

      const followup = await prisma.followup.create({
        data: {
          clientId,
          meetingId: meetingId || null,
          title,
          description,
          followupType: followupType || 'GENERAL',
          priority: priority || 'MEDIUM',
          status: 'PENDING',
          dueDate: fuDate,
          dueTime: dueTime || '17:00',
          reminderDate: reminderDate ? new Date(reminderDate) : fuDate,
          reminderChannel: reminderChannel || 'ALL',
          assignedUserId: assignedUser
        },
        include: { client: { include: { company: true } }, assignedUser: true }
      });

      // Update client nextFollowupDate
      await prisma.client.update({
        where: { id: clientId },
        data: { nextFollowupDate: fuDate }
      });

      // Activity
      await prisma.activity.create({
        data: {
          clientId,
          userId: req.user!.id,
          type: 'FOLLOWUP_CREATED',
          title: `Follow-up Scheduled: ${title}`,
          description: `Due on ${fuDate.toLocaleDateString()} (${followupType || 'General'})`,
          metadataJson: JSON.stringify({ followupId: followup.id })
        }
      });

      AuditService.log(req.user!.id, 'CREATE', 'FOLLOWUP', followup.id);

      return sendSuccess(res, followup, 'Follow-up created and scheduled', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async updateFollowup(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, followupType, priority, status, dueDate, dueTime, assignedUserId } = req.body;

      const updated = await prisma.followup.update({
        where: { id },
        data: {
          title,
          description,
          followupType,
          priority,
          status,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          dueTime,
          assignedUserId,
          completedAt: status === 'COMPLETED' ? new Date() : undefined
        },
        include: { client: { include: { company: true } }, assignedUser: true }
      });

      AuditService.log(req.user!.id, 'UPDATE', 'FOLLOWUP', id);

      return sendSuccess(res, updated, 'Follow-up updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async markComplete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const followup = await prisma.followup.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date() },
        include: { client: { include: { company: true } } }
      });

      await prisma.activity.create({
        data: {
          clientId: followup.clientId,
          userId: req.user!.id,
          type: 'FOLLOWUP_COMPLETED',
          title: `Follow-up Completed: ${followup.title}`,
          description: `Completed on ${new Date().toLocaleDateString()}`
        }
      });

      AuditService.log(req.user!.id, 'COMPLETE', 'FOLLOWUP', id);

      return sendSuccess(res, followup, 'Follow-up marked as completed');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async deleteFollowup(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await prisma.followup.delete({ where: { id } });
      AuditService.log(req.user!.id, 'DELETE', 'FOLLOWUP', id);
      return sendSuccess(res, null, 'Follow-up deleted successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
