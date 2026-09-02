import * as shippingService from './shipping.service.js';

export function listShippingMethods(req, res, next) {
  try {
    res.json({ success: true, data: shippingService.getShippingMethods() });
  } catch (err) {
    next(err);
  }
}
