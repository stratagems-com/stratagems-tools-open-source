import { Router } from 'express';
import * as userController from '../../controllers/v1/user.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const router: Router = Router();

// Invitation routes
router.post('/invite', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), userController.inviteUser);
router.post('/accept-invitation', userController.acceptInvitation);

// User management routes
router.get('/', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), userController.getUsers);
router.post('/', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), userController.createUser);
router.get('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), userController.getUser);
router.put('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), userController.updateUser);
router.patch('/:id/toggle-status', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), userController.toggleUserStatus);
router.post('/:id/reset-password', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), userController.resetUserPassword);
router.delete('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), userController.deleteUser);


export default router;