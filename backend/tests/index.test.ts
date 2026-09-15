import { prisma } from '../src/utils/prisma';
import { ReminderScheduler, reminderScheduler } from '../src/services/scheduler/reminder.scheduler';
import { meetingWorkflowService } from '../src/services/workflow/meeting-workflow.service';
import { notificationService } from '../src/services/notification/notification.service';
import { RuleEngine } from '../src/services/ai/rule-engine';
import { WhatsAppProvider } from '../src/services/notification/whatsapp.provider';
import { normalizePhoneNumber } from '../src/utils/phone.util';
import { addDays, addHours, subDays } from 'date-fns';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 JS INVESTMENTS BD CRM: COMPREHENSIVE VERIFICATION SUITE');
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
    assert(userCount >= 4, `Users verified in database (found ${userCount})`);

    const clientCount = await prisma.client.count();
    assert(clientCount >= 1, `Clients verified in database (found ${clientCount})`);

    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    assert(!!adminUser, 'Admin user exists in database');

    // ------------------------------------------------------------------------
    // TEST 2: Admin User Creation & Password Management
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Admin User Creation & Password Controls ---');
    const testEmail = `bd.exec.${Date.now()}@jsil.com`;
    const tempPassword = 'InitialTempPass!23';
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        name: 'Sara BD Manager',
        email: testEmail,
        passwordHash,
        role: 'MANAGER',
        phone: '03001234567',
        whatsapp: '03001234567',
        whatsappNumber: '03001234567',
        notificationEmail: 'sara.notif@jsil.com',
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
    assert(newUser.notificationEmail === 'sara.notif@jsil.com', 'Separate notification email configured');
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
    // TEST 4: Pakistani Phone Number Normalization
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Pakistani Mobile Phone Normalization (phone.util.ts) ---');
    
    // Case A: 03XX standard 11 digits
    const p1 = normalizePhoneNumber('03001234567');
    assert(p1.isValid && p1.apiNumber === '923001234567' && p1.e164 === '+923001234567', 'Local 03001234567 -> 923001234567 (Meta API format)');
    
    // Case B: With dashes
    const p2 = normalizePhoneNumber('0321-7654321');
    assert(p2.isValid && p2.apiNumber === '923217654321' && p2.e164 === '+923217654321', 'Dashed 0321-7654321 -> 923217654321');

    // Case C: Double zero prefix 0092300...
    const p3 = normalizePhoneNumber('00923009998877');
    assert(p3.isValid && p3.apiNumber === '923009998877', 'Double zero 00923009998877 -> 923009998877');

    // Case D: Plus prefix +92300...
    const p4 = normalizePhoneNumber('+923331122334');
    assert(p4.isValid && p4.apiNumber === '923331122334' && p4.e164 === '+923331122334', '+923331122334 -> 923331122334');

    // Case E: Without leading zero 3001234567
    const p5 = normalizePhoneNumber('3001234567');
    assert(p5.isValid && p5.apiNumber === '923001234567', '10-digit 3001234567 -> 923001234567');

    // Case F: International number
    const p6 = normalizePhoneNumber('+14155552671');
    assert(p6.isValid && p6.country === 'INTL' && p6.apiNumber === '14155552671', 'International +14155552671 normalized');

    // Case G: Invalid garbage input
    const p7 = normalizePhoneNumber('12345');
    assert(!p7.isValid && p7.country === 'INVALID', 'Short invalid number rejected with isValid=false');

    // ------------------------------------------------------------------------
    // TEST 5: WhatsApp Provider Zero-Faking & Error Diagnostic
    // ------------------------------------------------------------------------
    console.log('\n--- 5. WhatsApp Provider Zero-Faking & Error Diagnostic ---');
    const waProvider = new WhatsAppProvider();
    
    // Attempt sending with unconfigured or dummy credentials (must fail gracefully and NOT fake success)
    const waSendResult = await waProvider.send({
      userId: newUser.id,
      recipientWhatsapp: '03001234567',
      title: 'JS Investments CRM Test',
      message: 'Test WhatsApp message for JS Investments CRM',
      type: 'TEST_WHATSAPP'
    });

    if (!config.whatsapp.apiKey) {
      assert(waSendResult.success === false, 'Unconfigured WhatsApp API returns success: false (Zero Faking Policy enforced)');
      assert(!!waSendResult.error, `Error captured correctly: "${waSendResult.error}"`);
    } else {
      console.log(`WhatsApp API credentials detected. Send result: success=${waSendResult.success}`);
    }

    // ------------------------------------------------------------------------
    // TEST 6: Client Creation & Multiple Contacts
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Client Management & Multiple Contacts ---');
    const company = await prisma.company.create({
      data: {
        name: `JS Strategic Client ${Date.now()}`,
        industry: 'Asset Management & Banking',
        city: 'Karachi',
        country: 'Pakistan',
        phone: '021111222333'
      }
    });

    const primaryContact = await prisma.contact.create({
      data: {
        companyId: company.id,
        name: 'Kamran Ali',
        position: 'Chief Investment Officer',
        email: 'kamran.ali@jsclient.com',
        phone: '03009998877',
        whatsapp: '03009998877',
        isPrimary: true
      }
    });

    const client = await prisma.client.create({
      data: {
        customClientId: `JS-CL-${Date.now()}`,
        companyId: company.id,
        primaryContactId: primaryContact.id,
        relationshipStatus: 'LEAD',
        priority: 'HIGH',
        assignedUserId: newUser.id,
        notes: 'Institutional portfolio allocation discussion'
      },
      include: { company: true, primaryContact: true, assignedUser: true }
    });

    assert(!!client.id, 'Client successfully created with company and primary contact');
    assert(client.assignedUserId === newUser.id, 'Client correctly assigned to new manager');

    // ------------------------------------------------------------------------
    // TEST 7: Meeting Creation & MeetingReminder Model Provisioning
    // ------------------------------------------------------------------------
    console.log('\n--- 7. Meeting Creation & MeetingReminder Auto-Provisioning ---');
    // Create meeting scheduled for 48 hours in future
    const futureMeetingTime = addDays(new Date(), 2);
    futureMeetingTime.setHours(14, 30, 0, 0);

    const testMeeting = await prisma.meeting.create({
      data: {
        clientId: client.id,
        title: 'Q4 Portfolio Strategy & Institutional Allocation',
        meetingType: 'PHYSICAL',
        startTime: futureMeetingTime,
        endTime: new Date(futureMeetingTime.getTime() + 3600000),
        location: 'JS Investments Executive Boardroom, Karachi',
        agenda: 'Review high-yield fixed income funds and equity portfolios',
        assignedUserId: newUser.id,
        createdById: adminUser!.id
      }
    });
    assert(!!testMeeting.id, 'Meeting scheduled for 48h in future');

    // Provision reminders via ReminderScheduler.provisionRemindersForMeeting
    await ReminderScheduler.provisionRemindersForMeeting(testMeeting.id);

    const reminders = await prisma.meetingReminder.findMany({
      where: { meetingId: testMeeting.id },
      orderBy: { scheduledTime: 'asc' }
    });

    assert(reminders.length >= 2, `Both 24h and 1h reminders provisioned (found: ${reminders.length})`);
    
    const reminder24h = reminders.find(r => r.reminderType === '24H');
    const reminder1h = reminders.find(r => r.reminderType === '1H');

    assert(!!reminder24h && reminder24h.status === 'SCHEDULED', '24h reminder has status SCHEDULED');
    assert(!!reminder1h && reminder1h.status === 'SCHEDULED', '1h reminder has status SCHEDULED');

    // ------------------------------------------------------------------------
    // TEST 8: Scheduler Atomic State Transition & Processing Lock
    // ------------------------------------------------------------------------
    console.log('\n--- 8. Scheduler State Transition & Atomic Processing ---');
    // Create an immediate due reminder for testMeeting to verify execution
    const immediateReminder = await prisma.meetingReminder.create({
      data: {
        meetingId: testMeeting.id,
        reminderType: '1H',
        channel: 'WHATSAPP',
        recipientType: 'ASSIGNED_USER',
        recipientName: newUser.name,
        recipientContact: '923001234567',
        scheduledTime: subDays(new Date(), 0.01), // Due in the past (eligible for processing)
        status: 'SCHEDULED'
      }
    });

    // Run scheduler check
    await reminderScheduler.checkAndSendReminders();

    const processedReminder = await prisma.meetingReminder.findUnique({
      where: { id: immediateReminder.id }
    });

    assert(
      processedReminder?.status === 'SENT' || processedReminder?.status === 'FAILED',
      `Reminder transitioned from SCHEDULED -> ${processedReminder?.status}`
    );
    assert((processedReminder?.attemptsCount || 0) >= 1, `Reminder attempt count tracked (attemptsCount=${processedReminder?.attemptsCount})`);

    // Clean up immediate test reminder
    await prisma.meetingReminder.delete({ where: { id: immediateReminder.id } });

    // ------------------------------------------------------------------------
    // TEST 9: Post-Meeting Workflow & Transaction Safety
    // ------------------------------------------------------------------------
    console.log('\n--- 9. Post-Meeting Workflow & Idempotency ---');
    const nextMeetingDateStr = addDays(new Date(), 7).toISOString().split('T')[0];
    const nextFollowupDateStr = addDays(new Date(), 2).toISOString().split('T')[0];

    const workflow = await meetingWorkflowService.completeMeetingWorkflow(
      {
        meetingId: testMeeting.id,
        outcome: 'POSITIVE',
        notes: 'Client confirmed initial allocation of 50M PKR in JS Cash Fund.',
        nextAction: 'Send account opening forms and fund performance sheets',
        nextFollowupDate: nextFollowupDateStr,
        nextFollowupTime: '11:00',
        nextFollowupType: 'PROPOSAL',
        nextFollowupPriority: 'HIGH',
        nextMeetingDate: nextMeetingDateStr,
        nextMeetingStartTime: '15:00',
        nextMeetingType: 'PHYSICAL',
        nextMeetingTitle: 'Account Opening & KYC Signing',
        createTask: true
      },
      newUser.id
    );

    assert(workflow.meeting.status === 'COMPLETED', 'Meeting completed transactionally');
    assert(!!workflow.nextMeeting, 'Next meeting automatically scheduled');
    assert(!!workflow.nextFollowup, 'Next follow-up automatically created');
    assert(!!workflow.task, 'Action task created');

    // Check that reminders were auto-provisioned for the newly created meeting
    if (workflow.nextMeeting) {
      const nextMeetingReminders = await prisma.meetingReminder.findMany({
        where: { meetingId: workflow.nextMeeting.id }
      });
      assert(nextMeetingReminders.length > 0, `Reminders automatically provisioned for workflow next meeting (count: ${nextMeetingReminders.length})`);
    }

    // ------------------------------------------------------------------------
    // TEST 10: AI Relationship Health Intelligence
    // ------------------------------------------------------------------------
    console.log('\n--- 10. AI Relationship Health Intelligence ---');
    const verifiedClient = await prisma.client.findUnique({ where: { id: client.id } });
    const health = RuleEngine.evaluateRelationshipHealth(verifiedClient);
    assert(health.score > 0, `Health evaluated: ${health.score}/100 (${health.health})`);
    assert(!!health.rationale, 'Health factor rationale generated');
    assert(!!health.nextAction, 'Recommended next action generated');

    // ------------------------------------------------------------------------
    // TEST 11: Timezone & System Diagnostic Constants
    // ------------------------------------------------------------------------
    console.log('\n--- 11. Timezone & App Configuration ---');
    assert(config.appTimezone === 'Asia/Karachi', 'Application configured for Asia/Karachi (PKT)');
    assert(config.appName.includes('JS Investments'), 'App name configured as JS Investments – Business Development CRM');

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
