import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { config } from '../config';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit/audit.service';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password) return sendError(res, 'Name, email, and password are required', 400);

      const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (existing) return sendError(res, 'Email already in use', 400);

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          passwordHash,
          role: role || 'BD_EXECUTIVE',
          status: 'ACTIVE',
          active: true,
          preferences: { create: { emailEnabled: true, whatsappEnabled: true } }
        }
      });
      return sendSuccess(res, { id: user.id, name: user.name, email: user.email, role: user.role }, 'Registration successful', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { preferences: true }
      });

      if (!user || user.status === 'INACTIVE' || !user.active) {
        return sendError(res, 'Invalid email or inactive account. Contact your CRM Administrator.', 401);
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return sendError(res, 'Invalid email or password', 401);
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      AuditService.log(user.id, 'LOGIN', 'USER', user.id, null, req.ip);

      return sendSuccess(res, {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          whatsapp: user.whatsapp,
          whatsappNumber: user.whatsappNumber,
          notificationEmail: user.notificationEmail,
          avatar: user.avatar,
          status: user.status,
          forcePasswordChange: user.forcePasswordChange,
          preferences: user.preferences
        }
      }, 'Login successful');
    } catch (err: any) {
      return sendError(res, err.message || 'Login failed', 400);
    }
  }

  static async getMe(req: AuthRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          whatsapp: true,
          whatsappNumber: true,
          countryCode: true,
          notificationEmail: true,
          avatar: true,
          status: true,
          forcePasswordChange: true,
          lastLoginAt: true,
          createdAt: true,
          preferences: true
        }
      });
      return sendSuccess(res, user);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { name, phone, whatsapp, whatsappNumber, countryCode, notificationEmail, avatar } = req.body;
      const updated = await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          name: name ? name.trim() : undefined,
          phone: phone !== undefined ? phone : undefined,
          whatsapp: whatsapp !== undefined ? whatsapp : undefined,
          whatsappNumber: whatsappNumber !== undefined ? whatsappNumber : (whatsapp !== undefined ? whatsapp : undefined),
          countryCode: countryCode !== undefined ? countryCode : undefined,
          notificationEmail: notificationEmail !== undefined ? notificationEmail : undefined,
          avatar: avatar !== undefined ? avatar : undefined
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          whatsapp: true,
          whatsappNumber: true,
          countryCode: true,
          notificationEmail: true,
          avatar: true
        }
      });
      return sendSuccess(res, updated, 'Profile updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async changePassword(req: AuthRequest, res: Response) {
    try {
      const { currentPassword, newPassword, confirmNewPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return sendError(res, 'Current password and new password are required', 400);
      }

      if (confirmNewPassword && newPassword !== confirmNewPassword) {
        return sendError(res, 'New password and confirm password do not match', 400);
      }

      // Password Complexity Validation: Minimum 8 chars, uppercase, lowercase, number, special char
      const hasLength = newPassword.length >= 8;
      const hasUpper = /[A-Z]/.test(newPassword);
      const hasLower = /[a-z]/.test(newPassword);
      const hasNumber = /[0-9]/.test(newPassword);
      const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);

      if (!hasLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
        return sendError(res, 'Password must be at least 8 characters and include uppercase, lowercase, number, and a special character.', 400);
      }

      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (!user) return sendError(res, 'User not found', 404);

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) return sendError(res, 'Current password entered is incorrect', 400);

      const newHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          forcePasswordChange: false
        }
      });

      AuditService.log(req.user!.id, 'CHANGE_PASSWORD', 'USER', user.id);

      return sendSuccess(res, null, 'Password successfully updated.');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
