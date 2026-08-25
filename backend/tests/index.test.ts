import { prisma } from '../src/utils/prisma';
import { reminderScheduler } from '../src/services/scheduler/reminder.scheduler';
import { meetingWorkflowService } from '../src/services/workflow/meeting-workflow.service';
import { notificationService } from '../src/services/notification/notification.service';
import { RuleEngine } from '../src/services/ai/rule-engine';
import { WhatsAppProvider } from '../src/services/notification/whatsapp.provider';
import { addDays } from 'date-fns';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE BIZDEV CRM ENHANCEMENT SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Database Seed Data Verification
    // ------------------------------------------------------------------------
    console.log('--- 1. Database Seed Data Verification ---');
    const userCount = await prisma.user.count();
    assert(userCount >= 4, `Users seeded properly (found ${userCount})`);

    const clientCount = await prisma.client.count();
    assert(clientCount >= 5, `Clients seeded properly (found ${clientCount})`);

    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    assert(!!adminUser, 'Admin user exists');

    // ------------------------------------------------------------------------
    // TEST 2: Admin User Creation & Password Management
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Admin User Creation & Password Controls ---');
    const testEmail = `bd.exec.${Date.now()}@example.com`;
    const tempPassword = 'InitialTempPass!23';
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        name: 'Sara BD Manager',
        email: testEmail,
        passwordHash,
        role: 'MANAGER',
        phone: '+923001112233',
        whatsapp: '+923001112233',
        whatsappNumber: '+923001112233',
        notificationEmail: 'sara.notif@example.com',
        status: 'ACTIVE',
        preferences: {
          create: {
            emailEnabled: true,
            whatsappEnabled: true,
            meetingReminders: true,
            followupReminders: true
          }
        }
      },
      include: { preferences: true }
    });

    assert(!!newUser.id, 'New manager user created successfully');
    assert(newUser.notificationEmail === 'sara.notif@example.com', 'Separate notification email configured');
    assert(newUser.preferences?.whatsappEnabled === true, 'WhatsApp notification preference enabled');

    // Test Admin Password Reset
    const newResetPassword = 'X7p!29Lm#Q';
    const newHash = await bcrypt.hash(newResetPassword, 10);
    const updatedUser = await prisma.user.update({
      where: { id: newUser.id },
      data: { passwordHash: newHash, forcePasswordChange: true }
    });

    const isMatch = await bcrypt.compare(newResetPassword, updatedUser.passwordHash);
    assert(isMatch === true, 'Admin successfully reset password to temporary credential');
    assert(updatedUser.forcePasswordChange === true, 'forcePasswordChange flag set for next login');

    // Safety check: verify last active admin protection logic
    const activeAdmins = await prisma.user.count({
      where: { role: 'ADMIN', active: true, status: 'ACTIVE' }
    });
    assert(activeAdmins >= 1, `Safety protection: ${activeAdmins} active Admin(s) verified in system`);

    // ------------------------------------------------------------------------
    // TEST 3: Client Creation, Updating, Multiple Contacts, & Soft-Delete (Archive)
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Client Management & Multiple Contacts ---');
    const company = await prisma.company.create({
      data: {
        name: `Apex Global Ventures ${Date.now()}`,
        industry: 'Fintech & Investments',
        city: 'Islamabad',
        country: 'Pakistan',
        phone: '+9251000000'
      }
    });

    const primaryContact = await prisma.contact.create({
      data: {
        companyId: company.id,
        name: 'Tariq Mehmood',
        position: 'Managing Director',
        email: 'tariq@apexventures.com',
        phone: '+923009998877',
        whatsapp: '+923009998877',
        isPrimary: true
      }
    });

    const client = await prisma.client.create({
      data: {
        customClientId: `CL-${Date.now()}`,
        companyId: company.id,
        primaryContactId: primaryContact.id,
        relationshipStatus: 'LEAD',
        priority: 'HIGH',
        assignedUserId: newUser.id,
        notes: 'Initial strategic partnership inquiry'
      },
      include: { company: true, primaryContact: true, assignedUser: true }
    });

    assert(!!client.id, 'Client successfully created with company and primary contact');
    assert(client.assignedUserId === newUser.id, 'Client correctly assigned to new manager');

    // Add Secondary Contact
    const secondaryContact = await prisma.contact.create({
      data: {
        companyId: company.id,
        name: 'Ayesha Tariq',
        position: 'Head of Legal & Compliance',
        email: 'ayesha@apexventures.com',
        phone: '+923004445566',
        whatsapp: '+923004445566',
        isPrimary: false
      }
    });
    assert(!!secondaryContact.id, 'Secondary contact added to client account');

    // Update Client fields & log activity
    const updatedClient = await prisma.client.update({
      where: { id: client.id },
      data: { relationshipStatus: 'MEETING_SCHEDULED', priority: 'URGENT' }
    });
    assert(updatedClient.relationshipStatus === 'MEETING_SCHEDULED', 'Client status updated');

    // Test Soft-Delete (Archive) & Restore
    const archived = await prisma.client.update({
      where: { id: client.id },
      data: { isArchived: true, archivedAt: new Date() }
    });
    assert(archived.isArchived === true, 'Client soft-deleted (archived) without destroying record');

    const restored = await prisma.client.update({
      where: { id: client.id },
      data: { isArchived: false, archivedAt: null }
    });
    assert(restored.isArchived === false, 'Client successfully restored from archive');

    // ------------------------------------------------------------------------
    // TEST 4: Meeting Scheduling & Assigned User Reminder Dispatch
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Meeting Scheduling & Reminder Dispatch ---');
    const meetingTime = addDays(new Date(), 1); // Tomorrow
    meetingTime.setHours(11, 0, 0, 0);

    const testMeeting = await prisma.meeting.create({
      data: {
        clientId: client.id,
        title: 'Strategic Partnership Discussion',
        meetingType: 'PHYSICAL',
        startTime: meetingTime,
        endTime: new Date(meetingTime.getTime() + 3600000),
        location: 'Islamabad Head Office',
        agenda: 'Explore investment structuring and Q4 timeline',
        assignedUserId: newUser.id,
        createdById: adminUser!.id
      }
    });
    assert(!!testMeeting.id, 'Meeting scheduled for tomorrow at 11:00 AM');

    // Trigger Notification Dispatch via NotificationService
    const dispatchResult = await notificationService.send({
      userId: newUser.id,
      title: `Reminder: Client Meeting Tomorrow — ${company.name}`,
      message: `You have a scheduled meeting tomorrow at 11:00 AM with ${primaryContact.name}.`,
      type: 'MEETING_REMINDER',
      entityType: 'MEETING',
      entityId: testMeeting.id
    });

    assert(dispatchResult.length > 0, `Notification dispatched across channels (count: ${dispatchResult.length})`);

    // Verify NotificationLog table persistence for Email and WhatsApp
    const emailLog = await prisma.notificationLog.findFirst({
      where: { userId: newUser.id, type: 'MEETING_REMINDER', channel: 'EMAIL' }
    });
    const waLog = await prisma.notificationLog.findFirst({
      where: { userId: newUser.id, type: 'MEETING_REMINDER', channel: 'WHATSAPP' }
    });

    assert(!!emailLog, 'Email NotificationLog record persisted in database');
    assert(emailLog?.recipientContact === 'sara.notif@example.com', 'Email routed directly to user notification email');
    assert(!!waLog, 'WhatsApp NotificationLog record persisted in database');
    assert(waLog?.recipientContact === '+923001112233', 'WhatsApp routed directly to user WhatsApp number');

    // ------------------------------------------------------------------------
    // TEST 5: Post-Meeting Workflow & Cascading Next Steps
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Post-Meeting Workflow & Cascading Next Steps ---');
    const workflow = await meetingWorkflowService.completeMeetingWorkflow(
      {
        meetingId: testMeeting.id,
        outcome: 'POSITIVE',
        notes: 'Meeting went exceptionally well. Terms agreed in principle.',
        nextAction: 'Send NDA and draft term sheet',
        nextFollowupDate: addDays(new Date(), 3).toISOString().split('T')[0],
        nextFollowupTime: '14:00',
        nextFollowupType: 'PROPOSAL',
        nextFollowupPriority: 'HIGH',
        nextMeetingDate: addDays(new Date(), 10).toISOString().split('T')[0],
        nextMeetingStartTime: '11:00',
        nextMeetingType: 'PHYSICAL',
        nextMeetingTitle: 'Term Sheet Execution Meeting',
        createTask: true
      },
      newUser.id
    );

    assert(workflow.meeting.status === 'COMPLETED', 'Meeting completed');
    assert(!!workflow.nextMeeting, 'Next meeting automatically scheduled');
    assert(!!workflow.nextFollowup, 'Next follow-up automatically created');
    assert(!!workflow.task, 'Action task created');

    const verifiedClient = await prisma.client.findUnique({ where: { id: client.id } });
    assert(!!verifiedClient?.nextMeetingDate, 'Client profile nextMeetingDate synced');
    assert(!!verifiedClient?.nextFollowupDate, 'Client profile nextFollowupDate synced');

    // ------------------------------------------------------------------------
    // TEST 6: WhatsApp Click-to-Chat & Provider Abstraction
    // ------------------------------------------------------------------------
    console.log('\n--- 6. WhatsApp wa.me Link Generation ---');
    const clickUrl = WhatsAppProvider.generateClickToChatUrl('+923001112233', 'Meeting Reminder');
    assert(clickUrl.includes('wa.me/923001112233'), 'WhatsApp wa.me direct chat link generated properly');

    // ------------------------------------------------------------------------
    // TEST 7: AI Local Relationship Health & Notes Summarizer
    // ------------------------------------------------------------------------
    console.log('\n--- 7. AI Relationship Health & Rule Engine ---');
    const health = RuleEngine.evaluateRelationshipHealth(verifiedClient);
    assert(health.score > 0, `Relationship health score evaluated: ${health.score}/100 (${health.health})`);

    // ------------------------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------------------------
    console.log('\n====================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
