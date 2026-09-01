import * as productService from './product.service.js';

/** Thin product HTTP handlers: call the service, shape the response envelope, and forward errors. */
export async function listProducts(req, res, next) {
  try {
    const { data, meta } = await productService.listProducts(req.query);
    res.json({ success: true, data, meta });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function listAdminProducts(req, res, next) {
  try {
    const { data, meta } = await productService.listAdminProducts(req.query);
    res.json({ success: true, data, meta });
  } catch (err) {
    next(err);
  }
}

export async function getAdminProduct(req, res, next) {
  try {
    const product = await productService.getAdminProductById(req.params.id);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req, res, next) {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    await productService.archiveProduct(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function restoreProduct(req, res, next) {
  try {
    const product = await productService.restoreProduct(req.params.id);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}
