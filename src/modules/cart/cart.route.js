import { Router } from 'express';
import * as cartController from './cart.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { addCartItemSchema, cartVariantIdParamsSchema, updateCartItemSchema } from './cart.schema.js';

const router = Router();

router.use(authenticate);
router.get('/', cartController.getCart);
router.post('/items', validate(addCartItemSchema), cartController.addCartItem);
router.patch('/items/:variantId', validate(cartVariantIdParamsSchema, 'params'), validate(updateCartItemSchema), cartController.updateCartItem);
router.delete('/items/:variantId', validate(cartVariantIdParamsSchema, 'params'), cartController.removeCartItem);
router.delete('/', cartController.clearCart);

export default router;
