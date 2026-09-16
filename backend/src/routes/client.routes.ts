import { Router } from 'express';
import { ClientController } from '../controllers/client.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();
router.use(authenticate);

router.get('/', ClientController.getClients);
router.post('/', requireRole(['ADMIN', 'MANAGER', 'BD_EXECUTIVE']), ClientController.createClient);
router.get('/:id', ClientController.getClientById);
router.put('/:id', requireRole(['ADMIN', 'MANAGER', 'BD_EXECUTIVE']), ClientController.updateClient);
router.patch('/:id/archive', requireRole(['ADMIN', 'MANAGER', 'BD_EXECUTIVE']), ClientController.archiveClient);
router.patch('/:id/restore', requireRole(['ADMIN', 'MANAGER', 'BD_EXECUTIVE']), ClientController.restoreClient);
router.delete('/:id', requireRole(['ADMIN', 'MANAGER', 'BD_EXECUTIVE']), ClientController.deleteClient);
router.get('/:id/timeline', ClientController.getTimeline);

// Contacts
router.post('/:clientId/contacts', requireRole(['ADMIN', 'MANAGER', 'BD_EXECUTIVE']), ClientController.addContact);
router.put('/contacts/:contactId', requireRole(['ADMIN', 'MANAGER', 'BD_EXECUTIVE']), ClientController.updateContact);
router.patch('/contacts/:contactId/archive', requireRole(['ADMIN', 'MANAGER', 'BD_EXECUTIVE']), ClientController.archiveContact);

export default router;
