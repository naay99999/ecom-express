import { describe, expect, it } from 'vitest';
import { calculateShippingCost, getShippingMethodKeys, listShippingMethods } from './shipping.registry.js';

describe('shipping registry', () => {
  it('exposes the flat-rate methods', () => {
    expect(getShippingMethodKeys()).toEqual(['standard', 'express']);
    expect(listShippingMethods()).toEqual([
      { key: 'standard', label: 'Standard Shipping' },
      { key: 'express', label: 'Express Shipping' },
    ]);
  });

  it('calculates a flat rate regardless of context', () => {
    expect(calculateShippingCost('standard', { subtotalAmount: 100 })).toBe(4000);
    expect(calculateShippingCost('express', {})).toBe(9900);
  });

  it('throws for an unknown method', () => {
    expect(() => calculateShippingCost('teleport', {})).toThrow('Unknown shipping method: teleport');
  });
});
