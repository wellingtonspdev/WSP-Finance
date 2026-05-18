import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthMiddleware } from '../../src/middlewares/AuthMiddleware';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

describe('AuthMiddleware Security', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('T4 - AuthMiddleware should not accept insecure fallback (should throw if no secret outside test env)', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'development';

    const req = {
      headers: {
        authorization: 'Bearer some-token'
      }
    } as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    // Verify it throws "JWT_SECRET is required"
    expect(() => AuthMiddleware(req, res, next)).toThrow('JWT_SECRET is required');
  });

  it('AuthMiddleware should pass with valid token when secret is correctly resolved', () => {
    process.env.JWT_SECRET = 'valid-test-secret';
    process.env.NODE_ENV = 'development';

    const token = jwt.sign({ sub: '123' }, 'valid-test-secret');

    const req = {
      headers: {
        authorization: `Bearer ${token}`
      }
    } as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    AuthMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).user.id).toBe(123);
  });
  it('Should return 401 if token is not provided', () => {
    process.env.JWT_SECRET = 'valid-test-secret';
    process.env.NODE_ENV = 'development';

    const req = {
      headers: {}
    } as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    AuthMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token not provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('Should return 401 if token is invalid', () => {
    process.env.JWT_SECRET = 'valid-test-secret';
    process.env.NODE_ENV = 'development';

    const req = {
      headers: {
        authorization: 'Bearer invalid-token'
      }
    } as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    AuthMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token invalid or expired' });
    expect(next).not.toHaveBeenCalled();
  });
});
