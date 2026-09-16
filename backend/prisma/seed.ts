import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding official JS Investments Business Development CRM...');

  const passwordHash = await bcrypt.hash('jsil123', 10);

  // 1. Create Team Users
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

  for (const member of teamMembers) {
    const existing = await prisma.user.findUnique({ where: { email: member.email.toLowerCase() } });
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
          status: 'ACTIVE'
        }
      });
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
    }
  }

  console.log('Seed completed successfully with 6 official JS Investments team accounts!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
