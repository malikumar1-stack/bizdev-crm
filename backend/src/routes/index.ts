import { Router } from 'express';
import { authenticateToken, loginRateLimiter } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

import { AuthController } from '../controllers/auth.controller';
import { ClientController } from '../controllers/client.controller';
import { MeetingController } from '../controllers/meeting.controller';
import { FollowupController } from '../controllers/followup.controller';
import { TaskController } from '../controllers/task.controller';
import { OpportunityController } from '../controllers/opportunity.controller';
import { CompanyController } from '../controllers/company.controller';
import { ContactController } from '../controllers/contact.controller';
import { NotificationController } from '../controllers/notification.controller';
import { ReportController } from '../controllers/report.controller';
import { AIController } from '../controllers/ai.controller';
import { UserController } from '../controllers/user.controller';
import { SettingController } from '../controllers/setting.controller';
import { SearchController } from '../controllers/search.controller';
import { ImportExportController } from '../controllers/import-export.controller';

const router = Router();

// Auth Routes (Public)
router.post('/auth/login', loginRateLimiter, AuthController.login);
router.post('/auth/register', AuthController.register);

// Protected Routes
router.use(authenticateToken);

// Auth Me
router.get('/auth/me', AuthController.getMe);
router.put('/auth/profile', AuthController.updateProfile);
router.post('/auth/change-password', AuthController.changePassword);

// Search
router.get('/search', SearchController.globalSearch);

// Clients
router.get('/clients', ClientController.getClients);
router.post('/clients', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), ClientController.createClient);
router.get('/clients/:id', ClientController.getClientById);
router.put('/clients/:id', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), ClientController.updateClient);
router.patch('/clients/:id/archive', requireRole('ADMIN', 'MANAGER'), ClientController.archiveClient);
router.patch('/clients/:id/restore', requireRole('ADMIN', 'MANAGER'), ClientController.restoreClient);
router.delete('/clients/:id', requireRole('ADMIN', 'MANAGER'), ClientController.deleteClient);
router.get('/clients/:id/timeline', ClientController.getTimeline);

// Client Contacts
router.post('/clients/:clientId/contacts', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), ClientController.addContact);
router.put('/clients/contacts/:contactId', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), ClientController.updateContact);
router.patch('/clients/contacts/:contactId/archive', requireRole('ADMIN', 'MANAGER'), ClientController.archiveContact);

// Meetings
router.get('/meetings', MeetingController.getMeetings);
router.post('/meetings', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), MeetingController.createMeeting);
router.get('/meetings/:id', MeetingController.getMeetingById);
router.put('/meetings/:id', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), MeetingController.updateMeeting);
router.post('/meetings/:id/workflow', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), MeetingController.completeWorkflow);
router.post('/meetings/:id/complete-workflow', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), MeetingController.completeWorkflow);
router.delete('/meetings/:id', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), MeetingController.deleteMeeting);

// Follow-ups
router.get('/followups', FollowupController.getFollowups);
router.post('/followups', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), FollowupController.createFollowup);
router.put('/followups/:id', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), FollowupController.updateFollowup);
router.patch('/followups/:id/complete', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), FollowupController.markComplete);
router.post('/followups/:id/complete', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), FollowupController.markComplete);
router.delete('/followups/:id', requireRole('ADMIN', 'MANAGER'), FollowupController.deleteFollowup);

// Tasks
router.get('/tasks', TaskController.getTasks);
router.post('/tasks', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), TaskController.createTask);
router.put('/tasks/:id', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), TaskController.updateTask);
router.delete('/tasks/:id', requireRole('ADMIN', 'MANAGER'), TaskController.deleteTask);

// Opportunities (Kanban Pipeline)
router.get('/opportunities', OpportunityController.getOpportunities);
router.post('/opportunities', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), OpportunityController.createOpportunity);
router.put('/opportunities/:id', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), OpportunityController.updateOpportunity);
router.patch('/opportunities/:id/stage', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), OpportunityController.updateStage);
router.delete('/opportunities/:id', requireRole('ADMIN', 'MANAGER'), OpportunityController.deleteOpportunity);

// Companies & Contacts
router.get('/companies', CompanyController.getCompanies);
router.post('/companies', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), CompanyController.createCompany);
router.get('/contacts', ContactController.getContacts);
router.post('/contacts', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), ContactController.createContact);

// Notifications & Preferences
router.get('/notifications', NotificationController.getNotifications);
router.patch('/notifications/:id/read', NotificationController.markAsRead);
router.put('/notifications/:id/read', NotificationController.markAsRead);
router.post('/notifications/read-all', NotificationController.markAllAsRead);
router.get('/notifications/preferences', NotificationController.getPreferences);
router.put('/notifications/preferences', NotificationController.updatePreferences);
router.post('/notifications/run-scheduler', NotificationController.triggerScheduler);

// Reports & Dashboard
router.get('/reports/dashboard', ReportController.getDashboardMetrics);
router.get('/reports/performance', ReportController.getBDPerformance);

// AI Assistant
router.post('/ai/chat', AIController.chat);
router.post('/ai/summarize-notes', AIController.summarizeMeetingNotes);
router.post('/ai/draft-followup', AIController.draftFollowup);
router.get('/ai/insights/:clientId', AIController.getClientInsights);

// Import & Export
router.post('/import-export/parse', ImportExportController.uploadMiddleware, ImportExportController.parseUpload);
router.post('/import-export/process', requireRole('ADMIN', 'MANAGER', 'BD_EXECUTIVE'), ImportExportController.processImport);
router.get('/import-export/export-clients', ImportExportController.exportClients);

// User Management (Admin)
router.get('/users', UserController.getUsers);
router.get('/users/:id', UserController.getUserById);
router.post('/users', requireRole('ADMIN'), UserController.createUser);
router.put('/users/:id', requireRole('ADMIN'), UserController.updateUser);
router.post('/users/:id/reset-password', requireRole('ADMIN'), UserController.resetPassword);
router.post('/users/:id/deactivate', requireRole('ADMIN'), UserController.deactivateUser);
router.post('/users/:id/reactivate', requireRole('ADMIN'), UserController.reactivateUser);
router.delete('/users/:id', requireRole('ADMIN'), UserController.deleteUser);
router.put('/users/:id/preferences', UserController.updatePreferences);

// Settings (Admin)
router.get('/settings', SettingController.getSettings);
router.put('/settings', requireRole('ADMIN'), SettingController.updateSettings);
router.post('/settings/test-email', requireRole('ADMIN'), SettingController.testEmail);
router.post('/settings/test-whatsapp', requireRole('ADMIN'), SettingController.testWhatsApp);
router.get('/settings/diagnostics', requireRole('ADMIN'), SettingController.getDiagnostics);
router.get('/settings/reminder-logs', requireRole('ADMIN', 'MANAGER'), SettingController.getReminderLogs);
router.get('/settings/notification-logs', SettingController.getNotificationLogs);
router.get('/settings/audit-logs', requireRole('ADMIN', 'MANAGER'), SettingController.getAuditLogs);
router.post('/settings/reset-test-data', requireRole('ADMIN'), SettingController.resetTestData);
router.post('/scheduler/trigger', NotificationController.triggerScheduler);

export default router;
