import { flatRateStrategies } from './strategies/flatRate.strategy.js';

/**
 * Each strategy implements calculate(context) -> amount (satang). Add a new
 * shipping method (e.g. weight-based) by adding an entry here — the checkout
 * Zod schema and order service both derive valid methods from this
 * registry's keys, so no call site needs to change.
 */
export const shippingRegistry = { ...flatRateStrategies };

export function getShippingMethodKeys() {
  return Object.keys(shippingRegistry);
}

export function listShippingMethods() {
  return Object.values(shippingRegistry).map(({ key, label }) => ({ key, label }));
}

export function calculateShippingCost(methodKey, context) {
  const strategy = shippingRegistry[methodKey];
  if (!strategy) throw new Error(`Unknown shipping method: ${methodKey}`);
  return strategy.calculate(context);
}
