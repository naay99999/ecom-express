import { Router } from 'express';
import * as shippingController from './shipping.controller.js';

const router = Router();

// Public — no auth. Mounted at /api/v1/shipping-methods in app.js so
// frontends can list valid method keys instead of hardcoding them.
router.get('/', shippingController.listShippingMethods);

export default router;
