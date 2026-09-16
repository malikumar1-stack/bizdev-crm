import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding official JS Investments BD Team User Accounts...');

  const passwordHash = await bcrypt.hash('password123', 10);

  const users = [
    {
      email: 'admin@jsil.com',
      name: 'Muhammad Tariq (Head of BD / Admin)',
      role: 'ADMIN',
      phone: '03001234567',
      whatsapp: '03001234567',
      whatsappNumber: '03001234567'
    },
    {
      email: 'admin@bizdevcrm.com',
      name: 'Muhammad Tariq (Admin)',
      role: 'ADMIN',
      phone: '03001234567',
      whatsapp: '03001234567',
      whatsappNumber: '03001234567'
    },
    {
      email: 'sarah.khan@jsil.com',
      name: 'Sarah Khan (Senior BD Manager)',
      role: 'MANAGER',
      phone: '03217654321',
      whatsapp: '03217654321',
      whatsappNumber: '03217654321'
    },
    {
      email: 'ali.raza@jsil.com',
      name: 'Ali Raza (BD Portfolio Executive)',
      role: 'BD_EXECUTIVE',
      phone: '03339876543',
      whatsapp: '03339876543',
      whatsappNumber: '03339876543'
    },
    {
      email: 'usman.tariq@jsil.com',
      name: 'Usman Tariq (BD Investment Executive)',
      role: 'BD_EXECUTIVE',
      phone: '03009988776',
      whatsapp: '03009988776',
      whatsappNumber: '03009988776'
    },
    {
      email: 'zainab.analyst@jsil.com',
      name: 'Zainab Qureshi (Investment Analyst / Viewer)',
      role: 'VIEWER',
      phone: '03455554433',
      whatsapp: '03455554433',
      whatsappNumber: '03455554433'
    }
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: u.name,
          passwordHash,
          role: u.role,
          phone: u.phone,
          whatsapp: u.whatsapp,
          whatsappNumber: u.whatsappNumber,
          active: true,
          status: 'ACTIVE'
        }
      });
      console.log(`Updated user: ${u.email}`);
    } else {
      await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          passwordHash,
          role: u.role,
          phone: u.phone,
          whatsapp: u.whatsapp,
          whatsappNumber: u.whatsappNumber,
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
      console.log(`Created user: ${u.email}`);
    }
  }

  console.log('All JS Investments team logins prepared successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
