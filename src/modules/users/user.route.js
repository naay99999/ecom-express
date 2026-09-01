import { Router } from 'express';
import * as userController from './user.controller.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { addressIdParamsSchema, addressSchema, listUsersQuerySchema, updateMeSchema, updateUserSchema, userIdParamsSchema } from './user.schema.js';

/**
 * User routes require authentication first; `/me` is self-service while the
 * remaining management endpoints require the admin role.
 */
const router = Router();

router.use(authenticate);

router.get('/me', userController.getMe);
router.patch('/me', validate(updateMeSchema), userController.updateMe);
router.post('/me/addresses', validate(addressSchema), userController.addAddress);
router.delete('/me/addresses/:addressId', validate(addressIdParamsSchema, 'params'), userController.removeAddress);

router.get('/', authorize('admin'), validate(listUsersQuerySchema, 'query'), userController.listUsers);
router.get('/:id', authorize('admin'), validate(userIdParamsSchema, 'params'), userController.getUser);
router.patch('/:id', authorize('admin'), validate(userIdParamsSchema, 'params'), validate(updateUserSchema), userController.updateUser);
router.delete('/:id', authorize('admin'), validate(userIdParamsSchema, 'params'), userController.deleteUser);

export default router;
