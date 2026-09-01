import * as orderService from './order.service.js';

function requestContext(req) {
  return { userId: req.user.id, isAdmin: req.user.role === 'admin' };
}

export async function checkoutOrder(req, res, next) {
  try {
    const order = await orderService.checkoutOrder(req.user.id, req.body);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function listOrders(req, res, next) {
  try {
    const { data, meta } = await orderService.listOrders({ ...requestContext(req), query: req.query });
    res.json({ success: true, data, meta });
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req, res, next) {
  try {
    const order = await orderService.getOrderById(req.params.id, requestContext(req));
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function cancelOrder(req, res, next) {
  try {
    const order = await orderService.cancelOrder(req.params.id, requestContext(req));
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}
