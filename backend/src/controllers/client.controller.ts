import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit/audit.service';
import { RuleEngine } from '../services/ai/rule-engine';

export class ClientController {
  static async getClients(req: AuthRequest, res: Response) {
    try {
      const { search, status, priority, assignedUserId, page = '1', limit = '50', sort = 'createdAt', order = 'desc', archivedOnly } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {
        isArchived: archivedOnly === 'true' ? true : false
      };

      if (status) where.relationshipStatus = status;
      if (priority) where.priority = priority;
      if (assignedUserId) where.assignedUserId = assignedUserId;

      if (search) {
        const query = search as string;
        where.OR = [
          { customClientId: { contains: query } },
          { company: { name: { contains: query } } },
          { primaryContact: { name: { contains: query } } },
          { primaryContact: { email: { contains: query } } }
        ];
      }

      const [total, clients] = await Promise.all([
        prisma.client.count({ where }),
        prisma.client.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { [sort as string]: order as string },
          include: {
            company: {
              include: { contacts: { where: { isArchived: false } } }
            },
            primaryContact: true,
            assignedUser: { select: { id: true, name: true, email: true, role: true, phone: true, whatsapp: true } },
            _count: {
              select: { meetings: true, followups: true, tasks: true, opportunities: true }
            }
          }
        })
      ]);

      return sendSuccess(res, clients, 'Clients retrieved', 200, {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getClientById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const client = await prisma.client.findUnique({
        where: { id },
        include: {
          company: {
            include: { contacts: { where: { isArchived: false } } }
          },
          primaryContact: true,
          assignedUser: { select: { id: true, name: true, email: true, role: true, phone: true, whatsapp: true } },
          meetings: {
            orderBy: { startTime: 'desc' },
            include: { assignedUser: true, participants: { include: { contact: true } } }
          },
          followups: {
            orderBy: { dueDate: 'asc' },
            include: { assignedUser: true }
          },
          tasks: {
            orderBy: { dueDate: 'asc' },
            include: { assignedUser: true }
          },
          opportunities: {
            orderBy: { createdAt: 'desc' },
            include: { assignedUser: true }
          },
          activities: {
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, name: true, email: true } } }
          }
        }
      });

      if (!client) return sendError(res, 'Client not found', 404);

      const health = RuleEngine.evaluateRelationshipHealth(client);

      return sendSuccess(res, { ...client, healthAnalysis: health });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async createClient(req: AuthRequest, res: Response) {
    try {
      const {
        companyName,
        industry,
        website,
        address,
        city,
        country,
        phone,
        contactPerson,
        contactName,
        jobTitle,
        contactPosition,
        email,
        contactEmail,
        contactPhone,
        whatsappNumber,
        contactWhatsapp,
        relationshipStatus,
        clientType,
        priority,
        leadSource,
        assignedUserId,
        notes
      } = req.body;

      const finalCompanyName = (companyName || '').trim();
      if (!finalCompanyName) return sendError(res, 'Company Name is required', 400);

      const finalContactName = (contactPerson || contactName || '').trim();
      const finalPosition = (jobTitle || contactPosition || '').trim();
      const finalEmail = (email || contactEmail || '').trim();
      const finalPhone = (contactPhone || phone || '').trim();
      const finalWhatsapp = (whatsappNumber || contactWhatsapp || finalPhone || '').trim();

      // Upsert Company
      let company = await prisma.company.findFirst({ where: { name: finalCompanyName } });
      if (!company) {
        company = await prisma.company.create({
          data: {
            name: finalCompanyName,
            industry: industry || 'Corporate',
            website: website || null,
            address: address || null,
            city: city || null,
            country: country || null,
            phone: finalPhone || null
          }
        });
      } else {
        // Update company metadata if provided
        company = await prisma.company.update({
          where: { id: company.id },
          data: {
            industry: industry || company.industry,
            website: website || company.website,
            address: address || company.address,
            city: city || company.city,
            country: country || company.country,
            phone: finalPhone || company.phone
          }
        });
      }

      // Create Primary Contact
      let contact = null;
      if (finalContactName) {
        contact = await prisma.contact.create({
          data: {
            companyId: company.id,
            name: finalContactName,
            position: finalPosition || 'Executive',
            email: finalEmail || null,
            phone: finalPhone || null,
            whatsapp: finalWhatsapp || null,
            isPrimary: true
          }
        });
      }

      const count = await prisma.client.count();
      const customClientId = `CL-${1001 + count}`;

      const client = await prisma.client.create({
        data: {
          customClientId,
          companyId: company.id,
          primaryContactId: contact?.id || null,
          relationshipStatus: relationshipStatus || 'LEAD',
          clientType: clientType || 'Corporate',
          priority: priority || 'MEDIUM',
          leadSource: leadSource || 'Direct Outreach',
          assignedUserId: assignedUserId || req.user!.id,
          notes: notes || null,
          isArchived: false
        },
        include: { company: true, primaryContact: true, assignedUser: true }
      });

      await prisma.activity.create({
        data: {
          clientId: client.id,
          userId: req.user!.id,
          type: 'CLIENT_CREATED',
          title: `Client Created: ${company.name}`,
          description: `Initial status: ${client.relationshipStatus}, Assigned to: ${client.assignedUser?.name || 'Unassigned'}`
        }
      });

      AuditService.log(req.user!.id, 'CREATE', 'CLIENT', client.id);

      return sendSuccess(res, client, 'Client created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async updateClient(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const {
        companyName,
        industry,
        website,
        address,
        city,
        country,
        phone,
        contactPerson,
        contactName,
        jobTitle,
        contactPosition,
        email,
        contactEmail,
        contactPhone,
        whatsappNumber,
        contactWhatsapp,
        relationshipStatus,
        clientType,
        priority,
        leadSource,
        assignedUserId,
        notes,
        primaryContactId
      } = req.body;

      const current = await prisma.client.findUnique({
        where: { id },
        include: { company: true, primaryContact: true, assignedUser: true }
      });
      if (!current) return sendError(res, 'Client not found', 404);

      // 1. Update Company
      if (companyName || industry || website || address || city || country || phone) {
        await prisma.company.update({
          where: { id: current.companyId },
          data: {
            name: companyName ? companyName.trim() : current.company.name,
            industry: industry !== undefined ? industry : current.company.industry,
            website: website !== undefined ? website : current.company.website,
            address: address !== undefined ? address : current.company.address,
            city: city !== undefined ? city : current.company.city,
            country: country !== undefined ? country : current.company.country,
            phone: phone !== undefined ? phone : current.company.phone
          }
        });
      }

      // 2. Update Primary Contact if fields provided
      const finalContactName = contactPerson || contactName;
      const finalPosition = jobTitle || contactPosition;
      const finalEmail = email || contactEmail;
      const finalPhone = contactPhone || phone;
      const finalWhatsapp = whatsappNumber || contactWhatsapp;

      if (current.primaryContactId && (finalContactName || finalPosition || finalEmail || finalPhone || finalWhatsapp)) {
        await prisma.contact.update({
          where: { id: current.primaryContactId },
          data: {
            name: finalContactName ? finalContactName.trim() : undefined,
            position: finalPosition ? finalPosition.trim() : undefined,
            email: finalEmail ? finalEmail.trim() : undefined,
            phone: finalPhone ? finalPhone.trim() : undefined,
            whatsapp: finalWhatsapp ? finalWhatsapp.trim() : undefined
          }
        });
      } else if (!current.primaryContactId && finalContactName) {
        const newContact = await prisma.contact.create({
          data: {
            companyId: current.companyId,
            name: finalContactName.trim(),
            position: finalPosition || 'Executive',
            email: finalEmail || null,
            phone: finalPhone || null,
            whatsapp: finalWhatsapp || null,
            isPrimary: true
          }
        });
        await prisma.client.update({
          where: { id },
          data: { primaryContactId: newContact.id }
        });
      }

      // 3. Update Client Record
      const updated = await prisma.client.update({
        where: { id },
        data: {
          relationshipStatus: relationshipStatus || current.relationshipStatus,
          clientType: clientType || current.clientType,
          priority: priority || current.priority,
          leadSource: leadSource !== undefined ? leadSource : current.leadSource,
          assignedUserId: assignedUserId !== undefined ? assignedUserId : current.assignedUserId,
          notes: notes !== undefined ? notes : current.notes,
          primaryContactId: primaryContactId !== undefined ? primaryContactId : current.primaryContactId
        },
        include: { company: true, primaryContact: true, assignedUser: true }
      });

      // 4. Audit & Timeline logs
      const changes: string[] = [];
      if (assignedUserId && assignedUserId !== current.assignedUserId) {
        const oldUser = current.assignedUser?.name || 'Unassigned';
        const newUser = updated.assignedUser?.name || 'Unassigned';
        changes.push(`Assigned manager changed from ${oldUser} to ${newUser}`);
        await prisma.activity.create({
          data: {
            clientId: id,
            userId: req.user!.id,
            type: 'ASSIGNED_USER_CHANGED',
            title: 'Assigned Manager Updated',
            description: `${req.user!.name} changed the assigned manager from ${oldUser} to ${newUser}.`
          }
        });
      }

      if (relationshipStatus && relationshipStatus !== current.relationshipStatus) {
        changes.push(`Relationship status changed from ${current.relationshipStatus} to ${relationshipStatus}`);
        await prisma.activity.create({
          data: {
            clientId: id,
            userId: req.user!.id,
            type: 'STATUS_CHANGED',
            title: `Relationship Status Changed to ${relationshipStatus}`,
            description: `Moved from ${current.relationshipStatus} to ${relationshipStatus}.`
          }
        });
      }

      if (priority && priority !== current.priority) {
        changes.push(`Priority changed from ${current.priority} to ${priority}`);
      }

      if (changes.length > 0) {
        AuditService.log(req.user!.id, 'UPDATE', 'CLIENT', id, { changes });
      }

      return sendSuccess(res, updated, 'Client updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async archiveClient(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const client = await prisma.client.update({
        where: { id },
        data: { isArchived: true, archivedAt: new Date() }
      });

      await prisma.activity.create({
        data: {
          clientId: id,
          userId: req.user!.id,
          type: 'CLIENT_ARCHIVED',
          title: 'Client Account Archived',
          description: `${req.user!.name} moved this client to archives.`
        }
      });

      AuditService.log(req.user!.id, 'ARCHIVE', 'CLIENT', id);
      return sendSuccess(res, client, 'Client archived successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async restoreClient(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const client = await prisma.client.update({
        where: { id },
        data: { isArchived: false, archivedAt: null }
      });

      await prisma.activity.create({
        data: {
          clientId: id,
          userId: req.user!.id,
          type: 'CLIENT_RESTORED',
          title: 'Client Account Restored',
          description: `${req.user!.name} restored this client from archives.`
        }
      });

      AuditService.log(req.user!.id, 'RESTORE', 'CLIENT', id);
      return sendSuccess(res, client, 'Client restored successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async deleteClient(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const client = await prisma.client.findUnique({
        where: { id },
        include: { company: true }
      });

      if (!client) {
        return sendError(res, 'Client not found', 404);
      }

      const companyId = client.companyId;
      const clientName = client.company?.name || client.customClientId;

      // Permanently delete the client (cascades meetings, tasks, followups, activities)
      await prisma.client.delete({
        where: { id }
      });

      // If company has no other clients and contacts, clean up the company record
      const otherClients = await prisma.client.count({ where: { companyId } });
      if (otherClients === 0) {
        await prisma.company.delete({ where: { id: companyId } }).catch(() => {});
      }

      AuditService.log(
        req.user!.id,
        'DELETE',
        'CLIENT',
        id,
        `Permanently deleted client ${client.customClientId} (${clientName})`
      );

      return sendSuccess(res, { id, deleted: true }, 'Client permanently deleted successfully');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to delete client', 400);
    }
  }

  // Contact management sub-endpoints
  static async addContact(req: AuthRequest, res: Response) {
    try {
      const { clientId } = req.params;
      const { name, position, email, phone, whatsapp, preferredMethod, notes, isPrimary } = req.body;
      if (!name) return sendError(res, 'Contact name is required', 400);

      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (!client) return sendError(res, 'Client not found', 404);

      if (isPrimary) {
        await prisma.contact.updateMany({
          where: { companyId: client.companyId },
          data: { isPrimary: false }
        });
      }

      const contact = await prisma.contact.create({
        data: {
          companyId: client.companyId,
          name: name.trim(),
          position: position || 'Executive',
          email,
          phone,
          whatsapp: whatsapp || phone,
          preferredMethod: preferredMethod || 'EMAIL',
          notes,
          isPrimary: !!isPrimary
        }
      });

      if (isPrimary) {
        await prisma.client.update({
          where: { id: clientId },
          data: { primaryContactId: contact.id }
        });
      }

      await prisma.activity.create({
        data: {
          clientId,
          userId: req.user!.id,
          type: 'CLIENT_UPDATED',
          title: `Contact Added: ${contact.name}`,
          description: `${contact.position} added as a key contact.`
        }
      });

      return sendSuccess(res, contact, 'Contact added successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async updateContact(req: AuthRequest, res: Response) {
    try {
      const { contactId } = req.params;
      const { name, position, email, phone, whatsapp, preferredMethod, notes, isPrimary } = req.body;

      const current = await prisma.contact.findUnique({ where: { id: contactId } });
      if (!current) return sendError(res, 'Contact not found', 404);

      if (isPrimary) {
        await prisma.contact.updateMany({
          where: { companyId: current.companyId },
          data: { isPrimary: false }
        });
      }

      const updated = await prisma.contact.update({
        where: { id: contactId },
        data: {
          name: name ? name.trim() : undefined,
          position: position !== undefined ? position : undefined,
          email: email !== undefined ? email : undefined,
          phone: phone !== undefined ? phone : undefined,
          whatsapp: whatsapp !== undefined ? whatsapp : undefined,
          preferredMethod: preferredMethod !== undefined ? preferredMethod : undefined,
          notes: notes !== undefined ? notes : undefined,
          isPrimary: isPrimary !== undefined ? isPrimary : undefined
        }
      });

      return sendSuccess(res, updated, 'Contact updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async archiveContact(req: AuthRequest, res: Response) {
    try {
      const { contactId } = req.params;
      const updated = await prisma.contact.update({
        where: { id: contactId },
        data: { isArchived: true }
      });
      return sendSuccess(res, updated, 'Contact archived successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getTimeline(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const activities = await prisma.activity.findMany({
        where: { clientId: id },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } }
      });
      return sendSuccess(res, activities);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }
}
