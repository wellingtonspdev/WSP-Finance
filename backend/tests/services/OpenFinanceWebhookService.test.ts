import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OpenFinanceWebhookService } from '../../src/services/OpenFinanceWebhookService';

describe('OpenFinanceWebhookService', () => {
  let service: OpenFinanceWebhookService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OpenFinanceWebhookService();
    delete process.env.OPEN_FINANCE_WEBHOOK_KEY;
  });

  it('should return false if OPEN_FINANCE_WEBHOOK_KEY is missing', () => {
    expect(service.isAuthorized('Bearer token')).toBe(false);
  });

  it('should return false if authorization header is missing', () => {
    process.env.OPEN_FINANCE_WEBHOOK_KEY = 'valid-token';
    expect(service.isAuthorized()).toBe(false);
  });

  it('should return true if token matches OPEN_FINANCE_WEBHOOK_KEY', () => {
    process.env.OPEN_FINANCE_WEBHOOK_KEY = 'valid-token';
    expect(service.isAuthorized('Bearer valid-token')).toBe(true);
  });

  it('should return false if token does not match', () => {
    process.env.OPEN_FINANCE_WEBHOOK_KEY = 'valid-token';
    expect(service.isAuthorized('Bearer invalid-token')).toBe(false);
  });

  it('should handle lowercase bearer scheme', () => {
    process.env.OPEN_FINANCE_WEBHOOK_KEY = 'valid-token';
    expect(service.isAuthorized('bearer valid-token')).toBe(true);
  });
});
