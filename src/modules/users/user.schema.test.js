import { describe, expect, it } from 'vitest';
import { addressSchema, updateMeSchema, updateUserSchema } from './user.schema.js';

describe('user write schemas', () => {
  it('rejects self-service attempts to change account state', () => {
    expect(updateMeSchema.safeParse({ isActive: true }).success).toBe(false);
    expect(updateMeSchema.safeParse({ role: 'admin' }).success).toBe(false);
  });

  it('rejects password and address writes from the admin update endpoint', () => {
    expect(updateUserSchema.safeParse({ password: 'new-password' }).success).toBe(false);
    expect(updateUserSchema.safeParse({ addresses: [] }).success).toBe(false);
  });
});

describe('addressSchema', () => {
  const baseThAddress = { line1: '99/9 Moo 4, Soi Ladprao 15', city: 'Khet Chatuchak', country: 'TH' };

  it('accepts a Thai address with a province and a 5-digit postal code', () => {
    const result = addressSchema.safeParse({ ...baseThAddress, state: 'Bangkok', postalCode: '10900' });
    expect(result.success).toBe(true);
  });

  it('rejects a Thai address missing the province', () => {
    const result = addressSchema.safeParse({ ...baseThAddress, postalCode: '10900' });
    expect(result.success).toBe(false);
  });

  it('rejects a Thai address with a non-5-digit postal code', () => {
    const result = addressSchema.safeParse({ ...baseThAddress, state: 'Bangkok', postalCode: '1090' });
    expect(result.success).toBe(false);
  });

  it('does not require a province for non-Thai addresses', () => {
    const result = addressSchema.safeParse({ line1: '221B Baker Street', city: 'London', postalCode: 'NW1 6XE', country: 'GB' });
    expect(result.success).toBe(true);
  });
});
