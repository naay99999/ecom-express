import { Router } from 'express';
import * as orderController from './order.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { checkoutOrderSchema, listOrdersQuerySchema, orderIdParamsSchema } from './order.schema.js';

const router = Router();

router.use(authenticate);
router.post('/', validate(checkoutOrderSchema), orderController.checkoutOrder);
router.get('/', validate(listOrdersQuerySchema, 'query'), orderController.listOrders);
router.get('/:id', validate(orderIdParamsSchema, 'params'), orderController.getOrder);
router.post('/:id/cancel', validate(orderIdParamsSchema, 'params'), orderController.cancelOrder);

export default router;
