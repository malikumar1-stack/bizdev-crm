import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit/audit.service';

export class UserController {
  static async getUsers(req: AuthRequest, res: Response) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          whatsapp: true,
          whatsappNumber: true,
          countryCode: true,
          notificationEmail: true,
          status: true,
          active: true,
          lastLoginAt: true,
          createdAt: true,
          preferences: true,
          _count: {
            select: { assignedClients: true, assignedMeetings: true, assignedFollowups: true, assignedTasks: true }
          }
        },
        orderBy: { name: 'asc' }
      });
      return sendSuccess(res, users);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getUserById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          whatsapp: true,
          whatsappNumber: true,
          countryCode: true,
          notificationEmail: true,
          status: true,
          active: true,
          lastLoginAt: true,
          createdAt: true,
          preferences: true,
          assignedClients: {
            where: { isArchived: false },
            include: { company: true, primaryContact: true }
          },
          assignedMeetings: {
            where: { status: 'SCHEDULED' },
            include: { client: { include: { company: true } } },
            orderBy: { startTime: 'asc' }
          },
          assignedFollowups: {
            where: { status: 'PENDING' },
            include: { client: { include: { company: true } } },
            orderBy: { dueDate: 'asc' }
          },
          assignedTasks: {
            where: { status: { not: 'COMPLETED' } },
            include: { client: { include: { company: true } } }
          },
          activities: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!user) return sendError(res, 'User not found', 404);
      return sendSuccess(res, user);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async createUser(req: AuthRequest, res: Response) {
    try {
      const { name, email, password, role, phone, whatsapp, whatsappNumber, notificationEmail, status } = req.body;
      if (!name || !email || !password) return sendError(res, 'Name, email, and temporary password are required', 400);

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return sendError(res, 'Email already in use', 400);

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          passwordHash,
          role: role || 'BD_EXECUTIVE',
          phone: phone || null,
          whatsapp: whatsapp || whatsappNumber || phone || null,
          whatsappNumber: whatsappNumber || whatsapp || phone || null,
          notificationEmail: notificationEmail || email.trim().toLowerCase(),
          status: status || 'ACTIVE',
          active: status === 'INACTIVE' ? false : true,
          forcePasswordChange: true,
          preferences: {
            create: {
              emailEnabled: true,
              whatsappEnabled: true,
              browserEnabled: true,
              inAppEnabled: true,
              meetingReminders: true,
              followupReminders: true,
              taskReminders: true
            }
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          whatsapp: true,
          whatsappNumber: true,
          notificationEmail: true,
          status: true,
          active: true
        }
      });

      AuditService.log(req.user!.id, 'CREATE_USER', 'USER', user.id, { createdRole: user.role, createdEmail: user.email });

      return sendSuccess(res, user, 'User created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async updateUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, email, role, phone, whatsapp, whatsappNumber, notificationEmail, status } = req.body;

      const target = await prisma.user.findUnique({ where: { id } });
      if (!target) return sendError(res, 'User not found', 404);

      // Protection: if changing role away from ADMIN, check if this is the last active Admin!
      if (target.role === 'ADMIN' && role && role !== 'ADMIN') {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN', active: true, status: 'ACTIVE' } });
        if (adminCount <= 1) {
          return sendError(res, 'Cannot change role of the last active Administrator', 400);
        }
      }

      const updated = await prisma.user.update({
        where: { id },
        data: {
          name: name ? name.trim() : undefined,
          email: email ? email.trim().toLowerCase() : undefined,
          role: role || undefined,
          phone: phone !== undefined ? phone : undefined,
          whatsapp: whatsapp !== undefined ? whatsapp : undefined,
          whatsappNumber: whatsappNumber !== undefined ? whatsappNumber : (whatsapp !== undefined ? whatsapp : undefined),
          notificationEmail: notificationEmail !== undefined ? notificationEmail : undefined,
          status: status !== undefined ? status : undefined,
          active: status === 'INACTIVE' ? false : (status === 'ACTIVE' ? true : undefined)
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          whatsapp: true,
          whatsappNumber: true,
          notificationEmail: true,
          status: true,
          active: true
        }
      });

      AuditService.log(req.user!.id, 'UPDATE_USER', 'USER', id, { previous: target, updated });

      return sendSuccess(res, updated, 'User updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async resetPassword(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { temporaryPassword } = req.body;

      const target = await prisma.user.findUnique({ where: { id } });
      if (!target) return sendError(res, 'User not found', 404);

      // Generate secure random temporary password if not provided
      let finalTempPass = temporaryPassword;
      if (!finalTempPass) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
        finalTempPass = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      }

      const passwordHash = await bcrypt.hash(finalTempPass, 10);
      await prisma.user.update({
        where: { id },
        data: {
          passwordHash,
          forcePasswordChange: true,
          tokenVersion: { increment: 1 }
        }
      });

      AuditService.log(req.user!.id, 'RESET_PASSWORD', 'USER', id, { targetUser: target.email });

      return sendSuccess(res, { temporaryPassword: finalTempPass }, 'Password successfully reset.');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async deactivateUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reassignToUserId } = req.body;

      const target = await prisma.user.findUnique({ where: { id } });
      if (!target) return sendError(res, 'User not found', 404);

      // Safety check: Cannot deactivate the last active Admin
      if (target.role === 'ADMIN') {
        const activeAdmins = await prisma.user.count({
          where: { role: 'ADMIN', active: true, status: 'ACTIVE', id: { not: id } }
        });
        if (activeAdmins === 0) {
          return sendError(res, 'Safety Violation: Cannot deactivate the last active Administrator', 400);
        }
      }

      // Reassign assigned clients, future meetings, follow-ups, and tasks if requested
      if (reassignToUserId) {
        const recipient = await prisma.user.findUnique({ where: { id: reassignToUserId } });
        if (!recipient || !recipient.active) {
          return sendError(res, 'Reassignment recipient user not found or inactive', 400);
        }

        await prisma.$transaction([
          prisma.client.updateMany({
            where: { assignedUserId: id },
            data: { assignedUserId: reassignToUserId }
          }),
          prisma.meeting.updateMany({
            where: { assignedUserId: id, status: 'SCHEDULED' },
            data: { assignedUserId: reassignToUserId }
          }),
          prisma.followup.updateMany({
            where: { assignedUserId: id, status: 'PENDING' },
            data: { assignedUserId: reassignToUserId }
          }),
          prisma.task.updateMany({
            where: { assignedUserId: id, status: { not: 'COMPLETED' } },
            data: { assignedUserId: reassignToUserId }
          })
        ]);

        AuditService.log(req.user!.id, 'REASSIGN_WORKLOAD', 'USER', id, {
          from: target.name,
          to: recipient.name
        });
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { active: false, status: 'INACTIVE' },
        select: { id: true, name: true, email: true, active: true, status: true }
      });

      AuditService.log(req.user!.id, 'DEACTIVATE_USER', 'USER', id);

      return sendSuccess(res, updated, 'User deactivated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async reactivateUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updated = await prisma.user.update({
        where: { id },
        data: { active: true, status: 'ACTIVE' },
        select: { id: true, name: true, email: true, active: true, status: true }
      });

      AuditService.log(req.user!.id, 'REACTIVATE_USER', 'USER', id);
      return sendSuccess(res, updated, 'User reactivated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async deleteUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const target = await prisma.user.findUnique({ where: { id } });
      if (!target) return sendError(res, 'User not found', 404);

      if (target.role === 'ADMIN') {
        const activeAdmins = await prisma.user.count({
          where: { role: 'ADMIN', active: true, status: 'ACTIVE', id: { not: id } }
        });
        if (activeAdmins === 0) {
          return sendError(res, 'Cannot delete the last active Administrator', 400);
        }
      }

      // Default to deactivation to preserve historical meetings and audit trail
      const updated = await prisma.user.update({
        where: { id },
        data: { active: false, status: 'INACTIVE' }
      });

      AuditService.log(req.user!.id, 'DELETE_USER', 'USER', id);
      return sendSuccess(res, updated, 'User deactivated / archived');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async updatePreferences(req: AuthRequest, res: Response) {
    try {
      const userId = req.params.id || req.user!.id;
      const {
        emailEnabled,
        whatsappEnabled,
        browserEnabled,
        inAppEnabled,
        meetingReminders,
        followupReminders,
        taskReminders
      } = req.body;

      const pref = await prisma.notificationPreference.upsert({
        where: { userId },
        update: {
          emailEnabled,
          whatsappEnabled,
          browserEnabled,
          inAppEnabled,
          meetingReminders,
          followupReminders,
          taskReminders
        },
        create: {
          userId,
          emailEnabled: emailEnabled !== undefined ? emailEnabled : true,
          whatsappEnabled: whatsappEnabled !== undefined ? whatsappEnabled : true,
          browserEnabled: browserEnabled !== undefined ? browserEnabled : true,
          inAppEnabled: inAppEnabled !== undefined ? inAppEnabled : true,
          meetingReminders: meetingReminders !== undefined ? meetingReminders : true,
          followupReminders: followupReminders !== undefined ? followupReminders : true,
          taskReminders: taskReminders !== undefined ? taskReminders : true
        }
      });

      return sendSuccess(res, pref, 'Notification preferences updated');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
