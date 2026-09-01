import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authLimiter } from '../../middleware/rateLimit.middleware.js';
import { registerSchema, loginSchema, changePasswordSchema } from './auth.schema.js';

/**
 * Auth endpoint wiring. Middleware runs left-to-right: limit, validate,
 * authenticate where needed, then delegate the HTTP response to the controller.
 */
const router = Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

export default router;
