import { Router } from 'express';
import * as productController from './product.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { createProductSchema, updateProductSchema, listAdminProductsQuerySchema, listProductsQuerySchema } from './product.schema.js';
import { validateObjectId } from '../../utils/validation.js';

/**
 * Product routes keep catalog reads public and protect writes with an access
 * token plus the admin role. Middleware order defines that request pipeline.
 */
const router = Router();

// Public
router.get('/', validate(listProductsQuerySchema, 'query'), productController.listProducts);

// Admin catalog endpoints must precede `/:id`.
router.get('/admin', authenticate, authorize('admin'), validate(listAdminProductsQuerySchema, 'query'), productController.listAdminProducts);
router.get('/admin/:id', authenticate, authorize('admin'), validateObjectId, productController.getAdminProduct);

// Admin only
router.post('/', authenticate, authorize('admin'), validate(createProductSchema), productController.createProduct);
router.post('/:id/restore', authenticate, authorize('admin'), validateObjectId, productController.restoreProduct);
router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validateObjectId,
  validate(updateProductSchema),
  productController.updateProduct,
);
router.delete('/:id', authenticate, authorize('admin'), validateObjectId, productController.deleteProduct);

router.get('/:id', validateObjectId, productController.getProduct);

export default router;
