import Cart from './cart.model.js';
import Product from '../products/product.model.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';

async function getAvailableVariant(productId, variantId) {
  const product = await Product.findOne({ _id: productId, isActive: true, variants: { $elemMatch: { _id: variantId, isActive: true } } });
  if (!product) throw new NotFoundError('Product not found');
  const variant = product.variants.id(variantId);
  if (!variant) throw new NotFoundError('Product variant not found');
  return { product, variant };
}

function assertAvailableStock(variant, quantity) {
  if (variant.stock < quantity) throw new ConflictError('Requested quantity is not available');
}

export async function getCart(userId) {
  const cart = await Cart.findOne({ userId }).populate('items.productId');
  return cart || { userId, items: [] };
}

export async function addCartItem(userId, { productId, variantId, quantity }) {
  const { variant } = await getAvailableVariant(productId, variantId);
  const cart = (await Cart.findOne({ userId })) || new Cart({ userId, items: [] });
  const item = cart.items.find((entry) => entry.variantId.toString() === variantId);
  const nextQuantity = (item?.quantity || 0) + quantity;
  assertAvailableStock(variant, nextQuantity);

  if (item) item.quantity = nextQuantity;
  else cart.items.push({ productId, variantId, quantity });
  await cart.save();
  return getCart(userId);
}

export async function updateCartItem(userId, variantId, quantity) {
  const cart = await Cart.findOne({ userId });
  const item = cart?.items.find((entry) => entry.variantId.toString() === variantId);
  if (!item) throw new NotFoundError('Cart item not found');
  const { variant } = await getAvailableVariant(item.productId.toString(), variantId);
  assertAvailableStock(variant, quantity);
  item.quantity = quantity;
  await cart.save();
  return getCart(userId);
}

export async function removeCartItem(userId, variantId) {
  const cart = await Cart.findOne({ userId });
  if (!cart) throw new NotFoundError('Cart item not found');
  const before = cart.items.length;
  cart.items = cart.items.filter((entry) => entry.variantId.toString() !== variantId);
  if (cart.items.length === before) throw new NotFoundError('Cart item not found');
  await cart.save();
  return getCart(userId);
}

export async function clearCart(userId) {
  await Cart.deleteOne({ userId });
}
