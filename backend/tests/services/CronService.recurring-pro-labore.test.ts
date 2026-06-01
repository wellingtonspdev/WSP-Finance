import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CronService } from '../../src/services/CronService';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    workspaceMember: { findMany: vi.fn() },
    transaction: { findMany: vi.fn(), groupBy: vi.fn() },
    account: { findMany: vi.fn() },
  },
  sysPrisma: {
    user: { findMany: vi.fn() },
  },
}));

vi.mock('../../src/repositories/NotificationRepository', () => ({
  NotificationRepository: class {
    create = vi.fn();
  },
}));

describe('CronService recurring pro-labore', () => {
  const cacheService = { refreshCache: vi.fn(), getCachedDashboard: vi.fn() };
  const recurringService = { generateDuePendings: vi.fn() };
  let service: CronService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CronService(cacheService as any, recurringService as any);
  });

  it('cron gera apenas pendencias e delega ao RecurringProLaboreService', async () => {
    recurringService.generateDuePendings.mockResolvedValue({ checked: 2, created: 1 });

    await service.generateRecurringProLaborePendings();

    expect(recurringService.generateDuePendings).toHaveBeenCalledTimes(1);
    expect(recurringService.generateDuePendings.mock.calls[0][0]).toBeInstanceOf(Date);
  });

  it('nao executa geracao concorrente', async () => {
    let resolveRun!: () => void;
    recurringService.generateDuePendings.mockReturnValue(new Promise((resolve) => {
      resolveRun = () => resolve({ checked: 1, created: 0 });
    }));

    const firstRun = service.generateRecurringProLaborePendings();
    await service.generateRecurringProLaborePendings();
    resolveRun();
    await firstRun;

    expect(recurringService.generateDuePendings).toHaveBeenCalledTimes(1);
  });
});
