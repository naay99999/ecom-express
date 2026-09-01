import Product from './product.model.js';
import { parsePagination, paginate } from '../../utils/pagination.js';
import { NotFoundError } from '../../utils/errors.js';
import { escapeRegex } from '../../utils/search.js';

function toPublicProduct(product) {
  const data = product.toObject ? product.toObject() : product;
  return { ...data, variants: data.variants.filter((variant) => variant.isActive) };
}

/** Product database operations. Services throw application errors and never send HTTP responses directly. */
export async function listProducts(query) {
  const pagination = parsePagination(query);
  const filter = { isActive: true };
  if (query.category) filter.category = query.category;
  if (query.search) filter.name = new RegExp(escapeRegex(query.search), 'i');

  const { data, meta } = await paginate(Product, filter, pagination);
  return { data: data.map(toPublicProduct), meta };
}

async function getActiveProductDocument(id) {
  const product = await Product.findOne({ _id: id, isActive: true });
  if (!product) throw new NotFoundError('Product not found');
  return product;
}

export async function getProductById(id) {
  return toPublicProduct(await getActiveProductDocument(id));
}

export async function listAdminProducts(query) {
  const pagination = parsePagination(query);
  const filter = {};
  if (query.status === 'active') filter.isActive = true;
  if (query.status === 'archived') filter.isActive = false;
  if (query.category) filter.category = query.category;
  if (query.search) filter.name = new RegExp(escapeRegex(query.search), 'i');
  return paginate(Product, filter, pagination);
}

export async function getAdminProductById(id) {
  const product = await Product.findById(id);
  if (!product) throw new NotFoundError('Product not found');
  return product;
}

export async function createProduct(data) {
  return Product.create(data);
}

export async function updateProduct(id, updates) {
  const product = await getActiveProductDocument(id);
  Object.assign(product, updates);
  await product.save();
  return product;
}

export async function archiveProduct(id) {
  const product = await Product.findByIdAndUpdate(id, { $set: { isActive: false, archivedAt: new Date() } }, { new: true });
  if (!product) throw new NotFoundError('Product not found');
  return product;
}

export async function restoreProduct(id) {
  const product = await Product.findByIdAndUpdate(id, { $set: { isActive: true, archivedAt: null } }, { new: true });
  if (!product) throw new NotFoundError('Product not found');
  return product;
}
