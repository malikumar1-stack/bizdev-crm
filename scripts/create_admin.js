#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log('\n==================================================');
  console.log('👤 BizDev CRM — Administrator Setup Utility');
  console.log('==================================================\n');

  const name = (await question('Full Name (e.g. Admin User): ')).trim() || 'Admin User';
  const email = (await question('Email Address (e.g. admin@company.com): ')).trim().toLowerCase();
  const password = (await question('Password (min 8 chars): ')).trim();

  if (!email || !password) {
    console.error('❌ Error: Email and password are required.');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  const phone = (await question('Phone / WhatsApp Number (optional): ')).trim() || null;

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        active: true,
        notificationEmail: email,
        phone,
        whatsapp: phone,
        whatsappNumber: phone
      },
      create: {
        email,
        name,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        active: true,
        notificationEmail: email,
        phone,
        whatsapp: phone,
        whatsappNumber: phone,
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
      }
    });

    console.log('\n✅ Administrator Account Configured Successfully!');
    console.log(`- Name: ${user.name}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Role: ${user.role}`);
    console.log('\nYou can now log in at http://localhost:5173\n');
  } catch (err) {
    console.error('❌ Failed to create administrator:', err.message);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main();
