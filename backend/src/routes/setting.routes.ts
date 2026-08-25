import { Router } from 'express';
import { SettingController } from '../controllers/setting.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();
router.use(authenticate);

router.get('/', SettingController.getSettings);
router.put('/', requireRole(['ADMIN']), SettingController.updateSettings);
router.post('/test-email', requireRole(['ADMIN']), SettingController.testEmail);
router.post('/test-whatsapp', requireRole(['ADMIN']), SettingController.testWhatsApp);
router.get('/notification-logs', SettingController.getNotificationLogs);
router.get('/audit-logs', requireRole(['ADMIN', 'MANAGER']), SettingController.getAuditLogs);

export default router;
