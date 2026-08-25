import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();
router.use(authenticate);

router.get('/', UserController.getUsers);
router.get('/:id', UserController.getUserById);
router.post('/', requireRole(['ADMIN']), UserController.createUser);
router.put('/:id', requireRole(['ADMIN']), UserController.updateUser);
router.post('/:id/reset-password', requireRole(['ADMIN']), UserController.resetPassword);
router.post('/:id/deactivate', requireRole(['ADMIN']), UserController.deactivateUser);
router.post('/:id/reactivate', requireRole(['ADMIN']), UserController.reactivateUser);
router.delete('/:id', requireRole(['ADMIN']), UserController.deleteUser);
router.put('/:id/preferences', UserController.updatePreferences);

export default router;
