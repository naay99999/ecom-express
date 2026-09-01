import { describe, expect, it } from 'vitest';
import { updateMeSchema, updateUserSchema } from './user.schema.js';

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
