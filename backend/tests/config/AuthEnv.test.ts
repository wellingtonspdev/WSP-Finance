import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getJwtSecret } from '../../src/config/authEnv';

describe('AuthEnv Helper', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('T1 - Should return JWT_SECRET when defined (simulating development/production)', () => {
    process.env.JWT_SECRET = 'valid-secret';
    process.env.NODE_ENV = 'development';

    const secret = getJwtSecret();

    expect(secret).toBe('valid-secret');
  });

  it('T2 - Should allow deterministic secret only in NODE_ENV=test', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'test';

    const secret = getJwtSecret();

    expect(secret).toBe('test-jwt-secret');
  });

  it('T3 - Should fail without JWT_SECRET outside test', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'development';

    expect(() => getJwtSecret()).toThrow('JWT_SECRET is required');

    process.env.NODE_ENV = 'production';
    expect(() => getJwtSecret()).toThrow('JWT_SECRET is required');
  });
  it('Should throw when JWT_SECRET is empty or whitespace outside test', () => {
    const cases = [
      { env: 'development', secret: '' },
      { env: 'development', secret: '   ' },
      { env: 'production', secret: '' },
      { env: 'production', secret: '   ' }
    ];

    for (const c of cases) {
      process.env.NODE_ENV = c.env;
      process.env.JWT_SECRET = c.secret;
      expect(() => getJwtSecret()).toThrow('JWT_SECRET is required');
    }
  });
});
