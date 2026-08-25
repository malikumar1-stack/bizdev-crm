import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit/audit.service';

export class TaskController {
  static async getTasks(req: AuthRequest, res: Response) {
    try {
      const { clientId, status, priority, assignedUserId } = req.query;
      const where: any = {};
      if (clientId) where.clientId = clientId;
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (assignedUserId) where.assignedUserId = assignedUserId;

      const tasks = await prisma.task.findMany({
        where,
        orderBy: { dueDate: 'asc' },
        include: {
          client: { include: { company: true } },
          assignedUser: { select: { id: true, name: true, email: true } }
        }
      });
      return sendSuccess(res, tasks);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async createTask(req: AuthRequest, res: Response) {
    try {
      const { clientId, title, description, dueDate, priority, status, assignedUserId } = req.body;
      if (!title) return sendError(res, 'Task title is required', 400);

      const task = await prisma.task.create({
        data: {
          clientId: clientId || null,
          title,
          description,
          dueDate: dueDate ? new Date(dueDate) : null,
          priority: priority || 'MEDIUM',
          status: status || 'TODO',
          assignedUserId: assignedUserId || req.user!.id
        },
        include: { client: { include: { company: true } }, assignedUser: true }
      });

      if (clientId) {
        await prisma.activity.create({
          data: {
            clientId,
            userId: req.user!.id,
            type: 'TASK_CREATED',
            title: `Task Created: ${title}`,
            description: description || ''
          }
        });
      }

      AuditService.log(req.user!.id, 'CREATE', 'TASK', task.id);
      return sendSuccess(res, task, 'Task created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async updateTask(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, dueDate, priority, status, assignedUserId } = req.body;

      const task = await prisma.task.update({
        where: { id },
        data: {
          title,
          description,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          priority,
          status,
          assignedUserId
        },
        include: { client: { include: { company: true } }, assignedUser: true }
      });

      AuditService.log(req.user!.id, 'UPDATE', 'TASK', id);
      return sendSuccess(res, task, 'Task updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async deleteTask(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await prisma.task.delete({ where: { id } });
      AuditService.log(req.user!.id, 'DELETE', 'TASK', id);
      return sendSuccess(res, null, 'Task deleted successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
