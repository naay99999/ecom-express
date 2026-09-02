import { Router } from 'express';
import * as orderController from './order.controller.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { checkoutOrderSchema, listOrdersQuerySchema, orderIdParamsSchema, shipOrderSchema } from './order.schema.js';

const router = Router();

router.use(authenticate);
router.post('/', validate(checkoutOrderSchema), orderController.checkoutOrder);
router.get('/', validate(listOrdersQuerySchema, 'query'), orderController.listOrders);
router.get('/:id', validate(orderIdParamsSchema, 'params'), orderController.getOrder);
router.post('/:id/cancel', validate(orderIdParamsSchema, 'params'), orderController.cancelOrder);

// Admin fulfillment actions.
router.post('/:id/confirm', authorize('admin'), validate(orderIdParamsSchema, 'params'), orderController.confirmOrder);
router.post(
  '/:id/ship',
  authorize('admin'),
  validate(orderIdParamsSchema, 'params'),
  validate(shipOrderSchema),
  orderController.shipOrder,
);
router.post('/:id/deliver', authorize('admin'), validate(orderIdParamsSchema, 'params'), orderController.deliverOrder);
router.post('/:id/refund', authorize('admin'), validate(orderIdParamsSchema, 'params'), orderController.refundOrder);

export default router;
