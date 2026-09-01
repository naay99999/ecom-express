import * as cartService from './cart.service.js';

export async function getCart(req, res, next) {
  try {
    const cart = await cartService.getCart(req.user.id);
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
}

export async function addCartItem(req, res, next) {
  try {
    const cart = await cartService.addCartItem(req.user.id, req.body);
    res.status(201).json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
}

export async function updateCartItem(req, res, next) {
  try {
    const cart = await cartService.updateCartItem(req.user.id, req.params.variantId, req.body.quantity);
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
}

export async function removeCartItem(req, res, next) {
  try {
    const cart = await cartService.removeCartItem(req.user.id, req.params.variantId);
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
}

export async function clearCart(req, res, next) {
  try {
    await cartService.clearCart(req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
