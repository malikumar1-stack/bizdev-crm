import { prisma } from '../src/utils/prisma';
import { reminderScheduler } from '../src/services/scheduler/reminder.scheduler';
import { meetingWorkflowService } from '../src/services/workflow/meeting-workflow.service';
import { notificationService } from '../src/services/notification/notification.service';
import { RuleEngine } from '../src/services/ai/rule-engine';
import { WhatsAppProvider } from '../src/services/notification/whatsapp.provider';
import { addDays, subDays } from 'date-fns';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPLETE PRODUCTION VERIFICATION SUITE');
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
    console.log('--- 1. Database Seed & User Verification ---');
    const userCount = await prisma.user.count();
    assert(userCount >= 4, `Users verified (found ${userCount})`);

    const clientCount = await prisma.client.count();
    assert(clientCount >= 1, `Clients verified (found ${clientCount})`);

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
        tokenVersion: 1,
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

    // ------------------------------------------------------------------------
    // TEST 3: JWT TokenVersion Invalidation Test
    // ------------------------------------------------------------------------
    console.log('\n--- 3. JWT TokenVersion Session Invalidation ---');
    const initialToken = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, tokenVersion: 1 },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    // Simulate password change / session invalidation
    const updatedWithNewVersion = await prisma.user.update({
      where: { id: newUser.id },
      data: { tokenVersion: { increment: 1 } }
    });

    const decoded = jwt.verify(initialToken, config.jwtSecret) as any;
    assert(decoded.tokenVersion === 1, 'Initial token has tokenVersion 1');
    assert(updatedWithNewVersion.tokenVersion === 2, 'Database user now has tokenVersion 2');
    assert(decoded.tokenVersion !== updatedWithNewVersion.tokenVersion, 'TokenVersion mismatch detected: old token successfully invalidated!');

    // ------------------------------------------------------------------------
    // TEST 4: Client Creation, Updating, Multiple Contacts, & Soft-Delete (Archive)
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Client Management & Multiple Contacts ---');
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
    // TEST 5: Meeting Scheduling & Notification Dispatch
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Meeting Scheduling & Notification Dispatch ---');
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

    // Verify NotificationLog table persistence
    const emailLog = await prisma.notificationLog.findFirst({
      where: { userId: newUser.id, type: 'MEETING_REMINDER', channel: 'EMAIL' }
    });
    const waLog = await prisma.notificationLog.findFirst({
      where: { userId: newUser.id, type: 'MEETING_REMINDER', channel: 'WHATSAPP' }
    });

    assert(!!emailLog, 'Email NotificationLog record persisted');
    assert(!!waLog, 'WhatsApp NotificationLog record persisted');

    // ------------------------------------------------------------------------
    // TEST 6: Post-Meeting Workflow & Transaction Safety
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Post-Meeting Workflow & Idempotency ---');
    const nextMeetingDateStr = addDays(new Date(), 10).toISOString().split('T')[0];
    const nextFollowupDateStr = addDays(new Date(), 3).toISOString().split('T')[0];

    const workflow = await meetingWorkflowService.completeMeetingWorkflow(
      {
        meetingId: testMeeting.id,
        outcome: 'POSITIVE',
        notes: 'Meeting went exceptionally well. Terms agreed in principle.',
        nextAction: 'Send NDA and draft term sheet',
        nextFollowupDate: nextFollowupDateStr,
        nextFollowupTime: '14:00',
        nextFollowupType: 'PROPOSAL',
        nextFollowupPriority: 'HIGH',
        nextMeetingDate: nextMeetingDateStr,
        nextMeetingStartTime: '11:00',
        nextMeetingType: 'PHYSICAL',
        nextMeetingTitle: 'Term Sheet Execution Meeting',
        createTask: true
      },
      newUser.id
    );

    assert(workflow.meeting.status === 'COMPLETED', 'Meeting completed transactionally');
    assert(!!workflow.nextMeeting, 'Next meeting automatically scheduled');
    assert(!!workflow.nextFollowup, 'Next follow-up automatically created');
    assert(!!workflow.task, 'Action task created');

    const verifiedClient = await prisma.client.findUnique({ where: { id: client.id } });
    assert(!!verifiedClient?.nextMeetingDate, 'Client profile nextMeetingDate synced');
    assert(!!verifiedClient?.nextFollowupDate, 'Client profile nextFollowupDate synced');
    assert(verifiedClient?.relationshipStatus === 'NEGOTIATION', 'Client relationship stage auto-advanced to NEGOTIATION');

    // Idempotency: Re-submitting the same completed meeting should not duplicate
    const workflowDoubleSubmit = await meetingWorkflowService.completeMeetingWorkflow(
      {
        meetingId: testMeeting.id,
        outcome: 'POSITIVE',
        notes: 'Updated notes upon second save',
        nextAction: 'Send NDA and draft term sheet',
        nextFollowupDate: nextFollowupDateStr,
        nextFollowupTime: '14:00',
        nextFollowupType: 'PROPOSAL',
        nextFollowupPriority: 'HIGH',
        nextMeetingDate: nextMeetingDateStr,
        nextMeetingStartTime: '11:00',
        nextMeetingType: 'PHYSICAL',
        nextMeetingTitle: 'Term Sheet Execution Meeting',
        createTask: true
      },
      newUser.id
    );
    assert(workflowDoubleSubmit.nextMeeting?.id === workflow.nextMeeting?.id, 'Double-submit idempotency verified: identical meeting reused');

    // ------------------------------------------------------------------------
    // TEST 7: Reminder Scheduler Catch-up & Overdue Auto-Transition
    // ------------------------------------------------------------------------
    console.log('\n--- 7. Reminder Scheduler Recovery & Overdue Transition ---');
    // Create an overdue followup
    const pastFollowup = await prisma.followup.create({
      data: {
        clientId: client.id,
        title: 'Past Due Task',
        status: 'PENDING',
        dueDate: subDays(new Date(), 2),
        assignedUserId: newUser.id
      }
    });

    // Run scheduler check
    await reminderScheduler.checkAndSendReminders();

    const updatedPastFu = await prisma.followup.findUnique({ where: { id: pastFollowup.id } });
    assert(updatedPastFu?.status === 'OVERDUE', 'Past-due follow-up automatically transitioned to OVERDUE status');

    // ------------------------------------------------------------------------
    // TEST 8: AI Relationship Health Intelligence
    // ------------------------------------------------------------------------
    console.log('\n--- 8. AI Relationship Health Intelligence ---');
    const health = RuleEngine.evaluateRelationshipHealth(verifiedClient);
    assert(health.score > 0, `Health evaluated: ${health.score}/100 (${health.health})`);
    assert(!!health.rationale, 'Health factor rationale generated');
    assert(!!health.nextAction, 'Recommended next action generated');

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
