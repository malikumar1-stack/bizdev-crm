import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding official JS Investments Team and resetting old accounts...');

  const passwordHash = await bcrypt.hash('jsil123', 10);

  const teamMembers = [
    {
      name: 'Raja Kamran',
      email: 'kamran.nazir@jsil.com',
      role: 'ADMIN',
      phone: '03335333445',
      whatsapp: '03335333445',
      whatsappNumber: '03335333445'
    },
    {
      name: 'Aamir Farooq',
      email: 'aamir.farooq@jsil.com',
      role: 'MANAGER',
      phone: '03125887898',
      whatsapp: '03125887898',
      whatsappNumber: '03125887898'
    },
    {
      name: 'Ali Zaidi',
      email: 'ali.zaidi@jsil.com',
      role: 'BD_EXECUTIVE',
      phone: '03360057619',
      whatsapp: '03360057619',
      whatsappNumber: '03360057619'
    },
    {
      name: 'Ebrahim Hussain',
      email: 'ebrahim.hussain@jsil.com',
      role: 'BD_EXECUTIVE',
      phone: '03709456349',
      whatsapp: '03709456349',
      whatsappNumber: '03709456349'
    },
    {
      name: 'Hassan Mehdi',
      email: 'hassan.mehdi@jsil.com',
      role: 'BD_EXECUTIVE',
      phone: '03102440000',
      whatsapp: '03102440000',
      whatsappNumber: '03102440000'
    },
    {
      name: 'Asif Ali',
      email: 'asif.ali@jsil.com',
      role: 'BD_EXECUTIVE',
      phone: '03455185478',
      whatsapp: '03455185478',
      whatsappNumber: '03455185478'
    }
  ];

  const allowedEmails = teamMembers.map(t => t.email.toLowerCase());

  // 1. Delete or unassign previous old users not in this list
  const usersToDelete = await prisma.user.findMany({
    where: {
      email: {
        notIn: allowedEmails
      }
    }
  });

  console.log(`Found ${usersToDelete.length} previous user accounts to remove.`);

  for (const oldUser of usersToDelete) {
    // Unlink any foreign key relations before deleting
    await prisma.meeting.updateMany({ where: { assignedUserId: oldUser.id }, data: { assignedUserId: null } });
    await prisma.meeting.updateMany({ where: { createdById: oldUser.id }, data: { createdById: null } });
    await prisma.client.updateMany({ where: { assignedUserId: oldUser.id }, data: { assignedUserId: null } });
    await prisma.followup.updateMany({ where: { assignedUserId: oldUser.id }, data: { assignedUserId: null } });
    await prisma.task.updateMany({ where: { assignedUserId: oldUser.id }, data: { assignedUserId: null } });
    await prisma.opportunity.updateMany({ where: { assignedUserId: oldUser.id }, data: { assignedUserId: null } });
    await prisma.notificationPreference.deleteMany({ where: { userId: oldUser.id } });
    await prisma.notificationLog.deleteMany({ where: { userId: oldUser.id } });
    await prisma.notification.deleteMany({ where: { userId: oldUser.id } });
    await prisma.activity.deleteMany({ where: { userId: oldUser.id } });
    await prisma.auditLog.deleteMany({ where: { userId: oldUser.id } });
    await prisma.aIConversation.deleteMany({ where: { userId: oldUser.id } });
    await prisma.user.delete({ where: { id: oldUser.id } });
    console.log(`Deleted previous user: ${oldUser.email}`);
  }

  // 2. Create or Update the 6 official JS Investments users
  for (const member of teamMembers) {
    const existing = await prisma.user.findUnique({
      where: { email: member.email.toLowerCase() },
      include: { preferences: true }
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: member.name,
          role: member.role,
          phone: member.phone,
          whatsapp: member.whatsapp,
          whatsappNumber: member.whatsappNumber,
          passwordHash,
          active: true,
          status: 'ACTIVE',
          tokenVersion: 1
        }
      });
      console.log(`✓ Updated team member: ${member.name} (${member.email})`);
    } else {
      await prisma.user.create({
        data: {
          name: member.name,
          email: member.email.toLowerCase(),
          role: member.role,
          phone: member.phone,
          whatsapp: member.whatsapp,
          whatsappNumber: member.whatsappNumber,
          passwordHash,
          active: true,
          status: 'ACTIVE',
          tokenVersion: 1,
          preferences: {
            create: {
              emailEnabled: true,
              whatsappEnabled: true,
              meetingReminders: true,
              followupReminders: true
            }
          }
        }
      });
      console.log(`✓ Created team member: ${member.name} (${member.email})`);
    }
  }

  // 3. Assign existing clients to Raja Kamran (Admin) so dashboard displays active pipeline immediately
  const admin = await prisma.user.findUnique({ where: { email: 'kamran.nazir@jsil.com' } });
  if (admin) {
    await prisma.client.updateMany({
      where: { assignedUserId: null },
      data: { assignedUserId: admin.id }
    });
  }

  console.log('🎉 Successfully configured official JS Investments team logins with password jsil123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
