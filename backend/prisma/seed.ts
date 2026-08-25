import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays, subDays, setHours, setMinutes } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Business Development CRM with realistic demo data...');

  // 1. Clean existing records safely
  await prisma.aIMessage.deleteMany();
  await prisma.aIConversation.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.followup.deleteMany();
  await prisma.meetingParticipant.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.client.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();

  // 2. Create Users & Preferences
  const passwordHash = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@bizdevcrm.com',
      passwordHash,
      name: 'Muhammad Tariq (Admin)',
      role: 'ADMIN',
      phone: '+92 300 1234567',
      whatsapp: '+92 300 1234567',
      active: true,
      preferences: {
        create: {
          emailEnabled: true,
          whatsappEnabled: true,
          browserEnabled: true,
          inAppEnabled: true,
          meetingReminderLeadHours: 24,
          followupReminderLeadHours: 24,
        }
      }
    }
  });

  const managerUser = await prisma.user.create({
    data: {
      email: 'sarah.manager@bizdevcrm.com',
      passwordHash,
      name: 'Sarah Khan (BD Manager)',
      role: 'MANAGER',
      phone: '+92 321 7654321',
      whatsapp: '+92 321 7654321',
      active: true,
      preferences: {
        create: {
          emailEnabled: true,
          whatsappEnabled: true,
          browserEnabled: true,
          inAppEnabled: true,
        }
      }
    }
  });

  const execUser = await prisma.user.create({
    data: {
      email: 'ali.exec@bizdevcrm.com',
      passwordHash,
      name: 'Ali Raza (BD Executive)',
      role: 'BD_EXECUTIVE',
      phone: '+92 333 9876543',
      whatsapp: '+92 333 9876543',
      active: true,
      preferences: {
        create: {
          emailEnabled: true,
          whatsappEnabled: true,
          browserEnabled: true,
          inAppEnabled: true,
        }
      }
    }
  });

  const viewerUser = await prisma.user.create({
    data: {
      email: 'viewer@bizdevcrm.com',
      passwordHash,
      name: 'Zainab Qureshi (Analyst / Viewer)',
      role: 'VIEWER',
      phone: '+92 345 5554433',
      whatsapp: '+92 345 5554433',
      active: true,
      preferences: {
        create: {
          emailEnabled: true,
          whatsappEnabled: false,
          browserEnabled: true,
          inAppEnabled: true,
        }
      }
    }
  });

  console.log('Created 4 users (Admin, Manager, BD Executive, Viewer)');

  // 3. Create Companies
  const abcCompany = await prisma.company.create({
    data: {
      name: 'ABC Investments',
      industry: 'Investment Banking & Asset Management',
      website: 'https://abcinvestments.example.com',
      address: 'Suite 900, Blue Area',
      city: 'Islamabad',
      country: 'Pakistan',
      phone: '+92 51 2233445',
      size: '250-500 employees',
      notes: 'Leading private equity and mutual funds investment house with strong regional footprint.'
    }
  });

  const xyzCompany = await prisma.company.create({
    data: {
      name: 'XYZ Capital Partners',
      industry: 'Venture Capital & Advisory',
      website: 'https://xyzcapital.example.com',
      address: 'Floor 14, Dolmen Executive Towers, Clifton',
      city: 'Karachi',
      country: 'Pakistan',
      phone: '+92 21 3588990',
      size: '50-100 employees',
      notes: 'Specializes in early-stage FinTech and SaaS investments across emerging markets.'
    }
  });

  const defCompany = await prisma.company.create({
    data: {
      name: 'DEF Holdings',
      industry: 'Conglomerate & Real Estate',
      website: 'https://defholdings.example.com',
      address: 'Gulberg III, Main Boulevard',
      city: 'Lahore',
      country: 'Pakistan',
      phone: '+92 42 3577112',
      size: '1000+ employees',
      notes: 'Diversified conglomerate exploring digital transformation partnerships.'
    }
  });

  const primeCompany = await prisma.company.create({
    data: {
      name: 'Prime Financial Group',
      industry: 'Commercial Banking & Wealth Management',
      website: 'https://primefg.example.com',
      address: 'I.I. Chundrigar Road',
      city: 'Karachi',
      country: 'Pakistan',
      phone: '+92 21 111-222-333',
      size: '2000+ employees',
      notes: 'High-value target for enterprise CRM integration and partnership.'
    }
  });

  const globalCompany = await prisma.company.create({
    data: {
      name: 'Global Asset Management',
      industry: 'Hedge Fund & Wealth Management',
      website: 'https://globalasset.example.com',
      address: 'DHA Phase 6',
      city: 'Lahore',
      country: 'Pakistan',
      phone: '+92 42 3711998',
      size: '100-250 employees',
      notes: 'Institutional portfolio management firm seeking recurring corporate advisory.'
    }
  });

  // 4. Create Contacts
  const contactAhmed = await prisma.contact.create({
    data: {
      companyId: abcCompany.id,
      name: 'Ahmed Khan',
      position: 'Chief Investment Officer (CIO)',
      email: 'ahmed.khan@abcinvestments.example.com',
      phone: '+92 300 8877665',
      whatsapp: '+92 300 8877665',
      preferredMethod: 'EMAIL',
      isPrimary: true,
      notes: 'Primary decision maker for external corporate advisory partnerships.'
    }
  });

  const contactFatima = await prisma.contact.create({
    data: {
      companyId: abcCompany.id,
      name: 'Fatima Noor',
      position: 'Head of Strategic Partnerships',
      email: 'fatima.noor@abcinvestments.example.com',
      phone: '+92 301 4455667',
      whatsapp: '+92 301 4455667',
      preferredMethod: 'WHATSAPP',
      isPrimary: false,
      notes: 'Coordinates meeting agendas and diligence materials.'
    }
  });

  const contactBilal = await prisma.contact.create({
    data: {
      companyId: xyzCompany.id,
      name: 'Bilal Tariq',
      position: 'Managing Partner',
      email: 'bilal.tariq@xyzcapital.example.com',
      phone: '+92 321 9988776',
      whatsapp: '+92 321 9988776',
      preferredMethod: 'PHONE',
      isPrimary: true,
      notes: 'Prefers concise executive briefings and direct ROI summaries.'
    }
  });

  const contactSarahJ = await prisma.contact.create({
    data: {
      companyId: defCompany.id,
      name: 'Sarah Jenkins',
      position: 'Vice President - Corporate BD',
      email: 'sarah.jenkins@defholdings.example.com',
      phone: '+92 333 1122334',
      whatsapp: '+92 333 1122334',
      preferredMethod: 'EMAIL',
      isPrimary: true,
      notes: 'Looking for a structured 3-year enterprise partnership model.'
    }
  });

  const contactKamran = await prisma.contact.create({
    data: {
      companyId: primeCompany.id,
      name: 'Kamran Siddiqui',
      position: 'Director of Business Development',
      email: 'kamran.siddiqui@primefg.example.com',
      phone: '+92 345 9988112',
      whatsapp: '+92 345 9988112',
      preferredMethod: 'EMAIL',
      isPrimary: true,
      notes: 'Evaluates enterprise technology and co-lending partnerships.'
    }
  });

  const contactZubair = await prisma.contact.create({
    data: {
      companyId: globalCompany.id,
      name: 'Zubair Chaudhry',
      position: 'Head of Portfolio Operations',
      email: 'zubair.c@globalasset.example.com',
      phone: '+92 300 3344556',
      whatsapp: '+92 300 3344556',
      preferredMethod: 'WHATSAPP',
      isPrimary: true,
      notes: 'Handles monthly reporting and recurring partnership syncs.'
    }
  });

  // 5. Create Clients
  const now = new Date();
  const tomorrow = addDays(now, 1);
  const nextWeek = addDays(now, 7);
  const lastWeek = subDays(now, 7);

  const clientABC = await prisma.client.create({
    data: {
      customClientId: 'CL-1001',
      companyId: abcCompany.id,
      primaryContactId: contactAhmed.id,
      relationshipStatus: 'MEETING_SCHEDULED',
      clientType: 'Enterprise',
      priority: 'HIGH',
      leadSource: 'Referral',
      assignedUserId: adminUser.id,
      notes: 'High potential strategic partner. Key objective is closing the annual distribution agreement.',
      lastContactDate: lastWeek,
      nextMeetingDate: setMinutes(setHours(tomorrow, 11), 0),
      nextFollowupDate: setMinutes(setHours(tomorrow, 16), 0)
    }
  });

  const clientXYZ = await prisma.client.create({
    data: {
      customClientId: 'CL-1002',
      companyId: xyzCompany.id,
      primaryContactId: contactBilal.id,
      relationshipStatus: 'NEGOTIATION',
      clientType: 'Strategic Partner',
      priority: 'URGENT',
      leadSource: 'Direct Inbound',
      assignedUserId: execUser.id,
      notes: 'Term sheet under review. Expected deal closure in Q3.',
      lastContactDate: subDays(now, 2),
      nextMeetingDate: setMinutes(setHours(addDays(now, 2), 14), 0),
      nextFollowupDate: setMinutes(setHours(now, 17), 0)
    }
  });

  const clientDEF = await prisma.client.create({
    data: {
      customClientId: 'CL-1003',
      companyId: defCompany.id,
      primaryContactId: contactSarahJ.id,
      relationshipStatus: 'FOLLOWUP_REQUIRED',
      clientType: 'Corporate',
      priority: 'MEDIUM',
      leadSource: 'Conference / Event',
      assignedUserId: managerUser.id,
      notes: 'Initial meeting concluded. Waiting for feedback on the updated technical proposal.',
      lastContactDate: subDays(now, 4),
      nextFollowupDate: subDays(now, 1) // Overdue follow-up for testing!
    }
  });

  const clientPrime = await prisma.client.create({
    data: {
      customClientId: 'CL-1004',
      companyId: primeCompany.id,
      primaryContactId: contactKamran.id,
      relationshipStatus: 'ACTIVE_CLIENT',
      clientType: 'Key Account',
      priority: 'HIGH',
      leadSource: 'Executive Network',
      assignedUserId: adminUser.id,
      notes: 'Active long-term relationship. Monthly recurring review required.',
      lastContactDate: subDays(now, 10),
      nextMeetingDate: setMinutes(setHours(nextWeek, 10), 0)
    }
  });

  const clientGlobal = await prisma.client.create({
    data: {
      customClientId: 'CL-1005',
      companyId: globalCompany.id,
      primaryContactId: contactZubair.id,
      relationshipStatus: 'LEAD',
      clientType: 'Corporate',
      priority: 'LOW',
      leadSource: 'Cold Outreach',
      assignedUserId: execUser.id,
      notes: 'Identified as prospective institutional investor. Initial outreach pending response.',
      lastContactDate: subDays(now, 14)
    }
  });

  console.log('Created 5 Clients');

  // 6. Create Meetings (Past, Today, Tomorrow, Future)
  // Tomorrow Meeting (The critical flow!)
  const meetingTomorrowABC = await prisma.meeting.create({
    data: {
      clientId: clientABC.id,
      title: 'Investment Partnership Discussion',
      meetingType: 'VIDEO_CONFERENCE',
      status: 'SCHEDULED',
      startTime: setMinutes(setHours(tomorrow, 11), 0),
      endTime: setMinutes(setHours(tomorrow, 12), 0),
      timezone: 'Asia/Karachi',
      location: 'Islamabad HQ & Google Meet',
      meetingLink: 'https://meet.google.com/abc-invest-bizdev',
      agenda: '1. Review Q3 partnership synergies\n2. Discuss co-investment terms\n3. Outline timeline for draft SLA.',
      notes: 'Ahmed Khan will be accompanied by Fatima Noor.',
      assignedUserId: adminUser.id,
      createdById: adminUser.id,
      reminded24h: false,
      reminded1h: false,
      participants: {
        create: [
          { contactId: contactAhmed.id, name: contactAhmed.name, email: contactAhmed.email, role: 'Client Executive' },
          { contactId: contactFatima.id, name: contactFatima.name, email: contactFatima.email, role: 'Client Coordinator' },
          { userId: adminUser.id, name: adminUser.name, email: adminUser.email, role: 'Lead BD Host' }
        ]
      }
    }
  });

  // Today Meeting
  const meetingTodayXYZ = await prisma.meeting.create({
    data: {
      clientId: clientXYZ.id,
      title: 'Term Sheet Finalization & Legal Sync',
      meetingType: 'ONLINE',
      status: 'SCHEDULED',
      startTime: setMinutes(setHours(now, 15), 30),
      endTime: setMinutes(setHours(now, 16), 30),
      timezone: 'Asia/Karachi',
      location: 'Microsoft Teams',
      meetingLink: 'https://teams.microsoft.com/l/meetup-join/xyz-capital',
      agenda: 'Walkthrough clauses 4 through 8 of the proposed term sheet.',
      assignedUserId: execUser.id,
      createdById: execUser.id,
      reminded24h: true,
      reminded1h: false
    }
  });

  // Past Completed Meeting (for DEF Holdings)
  const meetingPastDEF = await prisma.meeting.create({
    data: {
      clientId: clientDEF.id,
      title: 'Initial Discovery & Capabilities Briefing',
      meetingType: 'PHYSICAL',
      status: 'COMPLETED',
      startTime: setMinutes(setHours(lastWeek, 14), 0),
      endTime: setMinutes(setHours(lastWeek, 15), 30),
      timezone: 'Asia/Karachi',
      location: 'DEF Headquarters, Gulberg III, Lahore',
      agenda: 'Introductions, company capabilities presentation, understanding DEF strategic goals.',
      notes: 'Meeting went very well. Sarah Jenkins expressed high interest in our portfolio management solution. Requested custom pricing.',
      outcome: 'PROPOSAL_REQUESTED',
      nextAction: 'Send revised commercial proposal and case studies before 5 Sep.',
      nextFollowupDate: subDays(now, 1),
      assignedUserId: managerUser.id,
      createdById: managerUser.id,
      reminded24h: true,
      reminded1h: true
    }
  });

  // Future Recurring Meeting (Prime Financial Group)
  const meetingFuturePrime = await prisma.meeting.create({
    data: {
      clientId: clientPrime.id,
      title: 'Monthly Relationship & Portfolio Review',
      meetingType: 'PHYSICAL',
      status: 'SCHEDULED',
      startTime: setMinutes(setHours(nextWeek, 10), 0),
      endTime: setMinutes(setHours(nextWeek, 11), 30),
      timezone: 'Asia/Karachi',
      location: 'Prime FG Boardroom, Karachi',
      agenda: 'Monthly KPI review and expansion discussion.',
      assignedUserId: adminUser.id,
      createdById: adminUser.id
    }
  });

  // 7. Create Follow-ups
  // Overdue follow-up for DEF Holdings
  const followupOverdueDEF = await prisma.followup.create({
    data: {
      clientId: clientDEF.id,
      meetingId: meetingPastDEF.id,
      title: 'Send customized enterprise proposal & tier breakdown',
      description: 'Prepare detailed PDF with 3 pricing tiers and SLA metrics requested by Sarah Jenkins.',
      followupType: 'PROPOSAL',
      priority: 'HIGH',
      status: 'OVERDUE',
      dueDate: subDays(now, 1),
      dueTime: '17:00',
      reminderDate: subDays(now, 1),
      reminderChannel: 'ALL',
      assignedUserId: managerUser.id
    }
  });

  // Today's Follow-up for XYZ Capital
  const followupTodayXYZ = await prisma.followup.create({
    data: {
      clientId: clientXYZ.id,
      meetingId: meetingTodayXYZ.id,
      title: 'Email updated legal term sheet draft',
      description: 'Ensure indemnification clause is reviewed by internal counsel before sending.',
      followupType: 'DOCUMENT',
      priority: 'URGENT',
      status: 'PENDING',
      dueDate: now,
      dueTime: '18:00',
      reminderDate: now,
      reminderChannel: 'ALL',
      assignedUserId: execUser.id
    }
  });

  // Tomorrow Follow-up for ABC Investments
  const followupTomorrowABC = await prisma.followup.create({
    data: {
      clientId: clientABC.id,
      meetingId: meetingTomorrowABC.id,
      title: 'Meeting follow-up summary & next steps memo',
      description: 'Send meeting minutes to Ahmed Khan and Fatima Noor after the 11:00 AM session.',
      followupType: 'EMAIL',
      priority: 'HIGH',
      status: 'PENDING',
      dueDate: tomorrow,
      dueTime: '16:00',
      reminderDate: tomorrow,
      reminderChannel: 'ALL',
      assignedUserId: adminUser.id
    }
  });

  // 8. Create Tasks
  await prisma.task.create({
    data: {
      clientId: clientABC.id,
      title: 'Prepare presentation deck for ABC Investments',
      description: 'Include historical yield benchmarks and team profiles.',
      dueDate: setMinutes(setHours(now, 18), 0),
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assignedUserId: adminUser.id
    }
  });

  await prisma.task.create({
    data: {
      clientId: clientDEF.id,
      title: 'Legal review of partnership NDA',
      description: 'Check intellectual property clauses with legal counsel.',
      dueDate: subDays(now, 2),
      priority: 'URGENT',
      status: 'OVERDUE',
      assignedUserId: managerUser.id
    }
  });

  await prisma.task.create({
    data: {
      clientId: clientXYZ.id,
      title: 'Verify commercial insurance compliance',
      description: 'Request certificate of insurance from XYZ compliance desk.',
      dueDate: addDays(now, 3),
      priority: 'MEDIUM',
      status: 'TODO',
      assignedUserId: execUser.id
    }
  });

  // 9. Create Opportunities (Sales Pipeline)
  await prisma.opportunity.create({
    data: {
      clientId: clientABC.id,
      title: 'Annual Co-Investment Partnership (2026-2027)',
      stage: 'MEETING',
      value: 150000,
      currency: 'USD',
      probability: 60,
      expectedCloseDate: addDays(now, 45),
      assignedUserId: adminUser.id,
      notes: 'Initial meeting scheduled for tomorrow. High probability of entering proposal stage.'
    }
  });

  await prisma.opportunity.create({
    data: {
      clientId: clientXYZ.id,
      title: 'Strategic Fund Advisory & Placement',
      stage: 'NEGOTIATION',
      value: 320000,
      currency: 'USD',
      probability: 80,
      expectedCloseDate: addDays(now, 20),
      assignedUserId: execUser.id,
      notes: 'Term sheet currently in final markup stage.'
    }
  });

  await prisma.opportunity.create({
    data: {
      clientId: clientDEF.id,
      title: 'Enterprise Digital Transformation Suite',
      stage: 'PROPOSAL',
      value: 85000,
      currency: 'USD',
      probability: 50,
      expectedCloseDate: addDays(now, 30),
      assignedUserId: managerUser.id,
      notes: 'Proposal sent. Awaiting feedback on tiered pricing.'
    }
  });

  await prisma.opportunity.create({
    data: {
      clientId: clientPrime.id,
      title: 'Wealth Management Syndication Retainer',
      stage: 'WON',
      value: 500000,
      currency: 'USD',
      probability: 100,
      expectedCloseDate: lastWeek,
      assignedUserId: adminUser.id,
      notes: 'Successfully closed and signed master services agreement!'
    }
  });

  await prisma.opportunity.create({
    data: {
      clientId: clientGlobal.id,
      title: 'Institutional Advisory Mandate',
      stage: 'LEAD',
      value: 120000,
      currency: 'USD',
      probability: 20,
      expectedCloseDate: addDays(now, 90),
      assignedUserId: execUser.id,
      notes: 'Prospecting phase.'
    }
  });

  // 10. Create Activity Logs / Timeline
  await prisma.activity.create({
    data: {
      clientId: clientABC.id,
      userId: adminUser.id,
      type: 'MEETING_SCHEDULED',
      title: 'Meeting Scheduled: Investment Partnership Discussion',
      description: 'Scheduled for ' + tomorrow.toLocaleDateString() + ' at 11:00 AM with Ahmed Khan.',
      metadataJson: JSON.stringify({ meetingId: meetingTomorrowABC.id })
    }
  });

  await prisma.activity.create({
    data: {
      clientId: clientDEF.id,
      userId: managerUser.id,
      type: 'MEETING_COMPLETED',
      title: 'Meeting Completed: Discovery & Briefing',
      description: 'Outcome: Proposal Requested. Next Action: Send enterprise proposal.',
      metadataJson: JSON.stringify({ meetingId: meetingPastDEF.id })
    }
  });

  await prisma.activity.create({
    data: {
      clientId: clientXYZ.id,
      userId: execUser.id,
      type: 'STATUS_CHANGED',
      title: 'Relationship Status Advanced to Negotiation',
      description: 'Client moved from Meeting Completed to Negotiation following successful term sheet review.',
      metadataJson: JSON.stringify({ previousStatus: 'MEETING_COMPLETED', newStatus: 'NEGOTIATION' })
    }
  });

  await prisma.activity.create({
    data: {
      clientId: clientPrime.id,
      userId: adminUser.id,
      type: 'OPPORTUNITY_STAGE_CHANGED',
      title: 'Opportunity Won: Wealth Management Syndication ($500,000)',
      description: 'Master services agreement executed by Kamran Siddiqui.',
      metadataJson: JSON.stringify({ value: 500000, stage: 'WON' })
    }
  });

  // 11. Create Notifications
  await prisma.notification.create({
    data: {
      userId: adminUser.id,
      title: 'Meeting Tomorrow: ABC Investments',
      message: 'You have a scheduled video conference with Ahmed Khan tomorrow at 11:00 AM PKT.',
      type: 'MEETING_REMINDER',
      entityType: 'MEETING',
      entityId: meetingTomorrowABC.id,
      read: false
    }
  });

  await prisma.notification.create({
    data: {
      userId: managerUser.id,
      title: 'Overdue Follow-up: DEF Holdings',
      message: 'Enterprise proposal follow-up for Sarah Jenkins was due yesterday.',
      type: 'OVERDUE_ALERT',
      entityType: 'FOLLOWUP',
      entityId: followupOverdueDEF.id,
      read: false
    }
  });

  await prisma.notification.create({
    data: {
      userId: execUser.id,
      title: 'Follow-up Due Today: XYZ Capital Partners',
      message: 'Legal term sheet draft email due by 6:00 PM today.',
      type: 'FOLLOWUP_REMINDER',
      entityType: 'FOLLOWUP',
      entityId: followupTodayXYZ.id,
      read: false
    }
  });

  // 12. Default Settings
  const defaultSettings = [
    { key: 'company_name', value: 'Apex Business Development & Advisory', description: 'Primary CRM Organization Name' },
    { key: 'timezone', value: 'Asia/Karachi', description: 'Default System Timezone' },
    { key: 'meeting_reminder_24h_enabled', value: 'true', description: 'Automatically dispatch 24h meeting reminders' },
    { key: 'meeting_reminder_1h_enabled', value: 'true', description: 'Automatically dispatch 1h meeting reminders' },
    { key: 'whatsapp_click_to_chat_fallback', value: 'true', description: 'Allow 1-click wa.me messaging when Cloud API is unconfigured' },
    { key: 'ai_engine_active', value: 'true', description: 'Enable intelligent relationship insights & note summarizer' }
  ];

  for (const s of defaultSettings) {
    await prisma.setting.create({ data: s });
  }

  console.log('Seed completed successfully! CRM is populated with rich, realistic data.');
}

main()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
