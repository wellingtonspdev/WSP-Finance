import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CronService } from '../../src/services/CronService';
import { AccountantCacheService } from '../../src/services/AccountantCacheService';
import { sysPrisma } from '../../src/lib/prisma';
import cron from 'node-cron';

vi.mock('../../src/lib/prisma', () => ({
  sysPrisma: {
    user: {
      findMany: vi.fn(),
    },
  },
  prisma: {
    workspaceMember: { findMany: vi.fn() },
    transaction: { findMany: vi.fn(), groupBy: vi.fn() },
    account: { findMany: vi.fn() }
  }
}));

vi.mock('../../src/services/AccountantCacheService');
vi.mock('node-cron', () => ({
  default: { schedule: vi.fn() },
  schedule: vi.fn()
}));
vi.mock('../../src/repositories/NotificationRepository'); // prevent issues from the original code

describe('CronService - Accountant Cache Refresh (#16)', () => {
  let cronService: CronService;
  let cacheServiceMock: AccountantCacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock console to prevent spam
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    cacheServiceMock = new AccountantCacheService();
    // Default instantiation injects the mock
    cronService = new CronService(cacheServiceMock); 
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('T1 - Anti-overlap: Se isCacheRefreshRunning === true, a rodada deve ser ignorada', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn');
    
    (cronService as any).isCacheRefreshRunning = true;

    await cronService.refreshAccountantCaches();

    expect(sysPrisma.user.findMany).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[CronCache] Refresh already running'));
  });

  it('T2 - Chamada por contador: Deve chamar refreshCache 1x por userId', async () => {
    vi.mocked(sysPrisma.user.findMany).mockResolvedValue([
      { id: 1, name: 'Contador 1' },
      { id: 2, name: 'Contador 2' }
    ] as any);

    vi.mocked(cacheServiceMock.refreshCache).mockResolvedValue({
      ok: true, workspacesProcessed: 1, errors: []
    });

    await cronService.refreshAccountantCaches();

    expect(sysPrisma.user.findMany).toHaveBeenCalledWith({
      where: { type: 'ACCOUNTANT' },
      select: { id: true, name: true }
    });
    expect(cacheServiceMock.refreshCache).toHaveBeenCalledTimes(2);
    expect(cacheServiceMock.refreshCache).toHaveBeenNthCalledWith(1, 1);
    expect(cacheServiceMock.refreshCache).toHaveBeenNthCalledWith(2, 2);
  });

  it('T3 - Falha isolada: Erro em um contador não derruba a rodada', async () => {
    vi.mocked(sysPrisma.user.findMany).mockResolvedValue([
      { id: 1, name: 'Contador 1' },
      { id: 2, name: 'Contador 2' }
    ] as any);

    vi.mocked(cacheServiceMock.refreshCache)
      .mockRejectedValueOnce(new Error('Simulated failure'))
      .mockResolvedValueOnce({ ok: true, workspacesProcessed: 1, errors: [] });

    vi.spyOn(console, 'error').mockImplementation(() => {});

    await cronService.refreshAccountantCaches();

    expect(cacheServiceMock.refreshCache).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error refreshing cache for accountant 1'));
  });

  it('T4 - Timeout: Se refreshCache não resolver em 25s, o próximo continua', async () => {
    vi.mocked(sysPrisma.user.findMany).mockResolvedValue([
      { id: 1, name: 'Contador 1' },
      { id: 2, name: 'Contador 2' }
    ] as any);

    let resolveFirstMock: any;
    const promise1 = new Promise((resolve) => { resolveFirstMock = resolve; });
    
    vi.mocked(cacheServiceMock.refreshCache)
      .mockImplementationOnce(() => promise1 as any)
      .mockResolvedValueOnce({ ok: true, workspacesProcessed: 1, errors: [] });

    const refreshPromise = cronService.refreshAccountantCaches();

    await vi.advanceTimersByTimeAsync(25000);

    await refreshPromise;

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Timeout (25000ms) refreshing cache for accountant 1'));
    expect(cacheServiceMock.refreshCache).toHaveBeenCalledTimes(2);
    resolveFirstMock(); 
  });

  it('T5 - Log de resumo final: Ao fim da rodada, deve haver log com totais', async () => {
    vi.mocked(sysPrisma.user.findMany).mockResolvedValue([
      { id: 1, name: 'Contador 1' },   // Sucesso
      { id: 2, name: 'Contador 2' },   // Erro
      { id: 3, name: 'Contador 3' }    // Timeout
    ] as any);

    vi.mocked(cacheServiceMock.refreshCache)
      .mockResolvedValueOnce({ ok: true, workspacesProcessed: 1, errors: [] })
      .mockRejectedValueOnce(new Error('Failure'))
      .mockImplementationOnce(() => new Promise(() => {}) as any); // Hangs

    const consoleLogSpy = vi.spyOn(console, 'log');

    const refreshPromise = cronService.refreshAccountantCaches();
    await vi.advanceTimersByTimeAsync(25000); 
    await refreshPromise;

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/\[CronCache\] Finished refresh round: \d+ms \| 1 success, 1 errors, 1 timeouts/));
  });

  it('T6 - Serialização: O segundo contador só pode começar depois do primeiro terminar', async () => {
    vi.mocked(sysPrisma.user.findMany).mockResolvedValue([
      { id: 1, name: 'Contador 1' },
      { id: 2, name: 'Contador 2' }
    ] as any);

    let resolveFirstCall: any;
    vi.mocked(cacheServiceMock.refreshCache)
      .mockImplementationOnce(() => {
        return new Promise((resolve) => {
          resolveFirstCall = resolve;
        });
      })
      .mockResolvedValueOnce({ ok: true, workspacesProcessed: 1, errors: [] });

    const promise = cronService.refreshAccountantCaches();
    await vi.advanceTimersByTimeAsync(0);

    expect(cacheServiceMock.refreshCache).toHaveBeenCalledTimes(1); 
    resolveFirstCall({ ok: true, workspacesProcessed: 1, errors: [] });
    // Flush promises so the loop continues
    await vi.advanceTimersByTimeAsync(0);
    
    expect(cacheServiceMock.refreshCache).toHaveBeenCalledTimes(2); 
    await promise;
  });

  it('T7 - start(): Registra os schedules esperados e liga isStarted', () => {
    cronService.start();
    expect((cronService as any).isStarted).toBe(true);

    const scheduleCalls = vi.mocked(cron.schedule).mock.calls;
    expect(scheduleCalls.some(call => call[0] === '*/30 * * * *')).toBe(true);

    // Call the callback to ensure it routes to refreshAccountantCaches
    const cacheRefreshCall = scheduleCalls.find(call => call[0] === '*/30 * * * *');
    expect(cacheRefreshCall).toBeDefined();
    if (cacheRefreshCall) {
      const callback = cacheRefreshCall[1] as any;
      const spyRefresh = vi.spyOn(cronService, 'refreshAccountantCaches').mockResolvedValueOnce(undefined);
      callback();
      expect(spyRefresh).toHaveBeenCalled();
    }
  });

  it('T8 - start(): Segunda chamada não agenda novamente e mantém proteções', () => {
    vi.mocked(cron.schedule).mockClear();
    const consoleWarnSpy = vi.spyOn(console, 'warn');
    
    cronService.start(); // primeira vez
    const callsAfterFirst = vi.mocked(cron.schedule).mock.calls.length;
    
    cronService.start(); // segunda vez
    
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Cron Service já foi iniciado'));
    expect(vi.mocked(cron.schedule).mock.calls.length).toBe(callsAfterFirst);
  });

  it('T9 - Falha na rodada (findMany): loga erro, ignora resumo e libera flag', async () => {
    vi.mocked(sysPrisma.user.findMany).mockRejectedValueOnce(new Error('DB failure'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await cronService.refreshAccountantCaches();

    // flag liberada
    expect((cronService as any).isCacheRefreshRunning).toBe(false);
    
    // log de falha de rodada emitido
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('CRITICAL ERROR: Accountant Cache refresh round failed entirely'));
    
    // log final de resumo evitado para não ser enganoso
    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringMatching(/Finished refresh round:/));
  });

  it('T10 - Falso sucesso evitado: Falha parcial de workspace conta como erro', async () => {
    vi.mocked(sysPrisma.user.findMany).mockResolvedValue([
      { id: 1, name: 'Contador Parcial' }
    ] as any);

    vi.mocked(cacheServiceMock.refreshCache)
      .mockResolvedValueOnce({ 
        ok: true, 
        workspacesProcessed: 1, 
        errors: [{ workspaceId: 99, message: 'Falha isolada WS' }] 
      });

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await cronService.refreshAccountantCaches();

    // Verificamos que emitiu o log de falha parcial
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Partial success for accountant 1: 1 workspace(s) failed.'));
    
    // Verificamos que NÂO logou "Successfully refreshed"
    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringMatching(/Successfully refreshed cache for accountant/));

    // Verificamos o saldo final da rodada contando como erro da rodada
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Finished refresh round: \d+ms \| 0 success, 1 errors, 0 timeouts/));
  });
});
