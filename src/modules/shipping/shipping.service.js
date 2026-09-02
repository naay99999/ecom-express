import { listShippingMethods } from '../../utils/shipping/shipping.registry.js';

export function getShippingMethods() {
  return listShippingMethods();
}
