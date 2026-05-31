import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { RecurringProLaboreService } from '../../src/services/RecurringProLaboreService';

const mocks = vi.hoisted(() => ({
  workspaceMemberFindUnique: vi.fn(),
  workspaceMemberFindMany: vi.fn(),
  scheduleCreate: vi.fn(),
  scheduleFindUnique: vi.fn(),
  scheduleFindMany: vi.fn(),
  scheduleUpdate: vi.fn(),
  pendingFindUnique: vi.fn(),
  pendingFindMany: vi.fn(),
  pendingUpdate: vi.fn(),
  pendingUpdateMany: vi.fn(),
  pendingUpsert: vi.fn(),
}));

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    workspaceMember: {
      findUnique: mocks.workspaceMemberFindUnique,
      findMany: mocks.workspaceMemberFindMany,
    },
    recurringProLaboreSchedule: {
      create: mocks.scheduleCreate,
      findUnique: mocks.scheduleFindUnique,
      findMany: mocks.scheduleFindMany,
      update: mocks.scheduleUpdate,
    },
    recurringProLaborePending: {
      findUnique: mocks.pendingFindUnique,
      findMany: mocks.pendingFindMany,
      update: mocks.pendingUpdate,
      updateMany: mocks.pendingUpdateMany,
      upsert: mocks.pendingUpsert,
    },
  },
}));

function owner(workspaceId: number, type: 'BUSINESS' | 'PERSONAL') {
  return { role: 'OWNER', workspace: { id: workspaceId, type } };
}

function schedule(overrides: Record<string, any> = {}) {
  return {
    id: 'schedule-1',
    sourceWorkspaceId: 10,
    destinationWorkspaceId: 20,
    amount: new Decimal('1500.0000'),
    dayOfMonth: 31,
    description: 'Pro-labore mensal',
    isActive: true,
    sourceWorkspace: { id: 10, type: 'BUSINESS', name: 'Empresa' },
    destinationWorkspace: { id: 20, type: 'PERSONAL', name: 'Pessoal' },
    ...overrides,
  };
}

function pending(overrides: Record<string, any> = {}) {
  return {
    id: 'pending-1',
    scheduleId: 'schedule-1',
    competence: new Date('2026-02-01T00:00:00Z'),
    status: 'PENDING',
    bridgeId: null,
    schedule: schedule(),
    ...overrides,
  };
}

describe('RecurringProLaboreService', () => {
  const bridgeService = { executeTransfer: vi.fn() };
  let service: RecurringProLaboreService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RecurringProLaboreService(bridgeService as any);
  });

  it('cria agendamento valido BUSINESS para PERSONAL somente para OWNER', async () => {
    mocks.workspaceMemberFindUnique
      .mockResolvedValueOnce(owner(10, 'BUSINESS'))
      .mockResolvedValueOnce(owner(20, 'PERSONAL'));
    mocks.scheduleCreate.mockResolvedValue(schedule());

    await service.createSchedule(7, {
      sourceWorkspaceId: 10,
      destinationWorkspaceId: 20,
      amount: 1500,
      dayOfMonth: 10,
      description: 'Pro-labore mensal',
    });

    expect(mocks.scheduleCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceWorkspaceId: 10,
        destinationWorkspaceId: 20,
        amount: expect.any(Decimal),
        dayOfMonth: 10,
        description: 'Pro-labore mensal',
        createdByUserId: 7,
      }),
      include: { sourceWorkspace: true, destinationWorkspace: true },
    });
  });

  it('bloqueia origem e destino iguais', async () => {
    await expect(service.createSchedule(7, {
      sourceWorkspaceId: 10,
      destinationWorkspaceId: 10,
      amount: 1500,
      dayOfMonth: 10,
      description: 'Pro-labore mensal',
    })).rejects.toMatchObject({ statusCode: 400 });

    expect(mocks.scheduleCreate).not.toHaveBeenCalled();
  });

  it('bloqueia usuario sem OWNER nos workspaces', async () => {
    mocks.workspaceMemberFindUnique.mockResolvedValueOnce({ role: 'EDITOR', workspace: { id: 10, type: 'BUSINESS' } });

    await expect(service.createSchedule(7, {
      sourceWorkspaceId: 10,
      destinationWorkspaceId: 20,
      amount: 1500,
      dayOfMonth: 10,
      description: 'Pro-labore mensal',
    })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('gera pendencia no ultimo dia quando dayOfMonth excede o mes e usa upsert por competencia', async () => {
    mocks.scheduleFindMany.mockResolvedValue([schedule()]);
    mocks.pendingUpsert.mockResolvedValue({
      id: 'pending-1',
      createdAt: new Date('2026-02-28T08:00:00Z'),
      updatedAt: new Date('2026-02-28T08:00:00Z'),
    });

    const result = await service.generateDuePendings(new Date('2026-02-28T12:00:00Z'));

    expect(result).toEqual({ checked: 1, created: 1 });
    expect(mocks.pendingUpsert).toHaveBeenCalledWith({
      where: {
        scheduleId_competence: {
          scheduleId: 'schedule-1',
          competence: new Date('2026-02-01T00:00:00Z'),
        },
      },
      update: {},
      create: {
        scheduleId: 'schedule-1',
        competence: new Date('2026-02-01T00:00:00Z'),
        status: 'PENDING',
      },
    });
  });

  it('nao gera pendencia fora do dia correto nem para agendamento inativo', async () => {
    mocks.scheduleFindMany.mockResolvedValue([schedule({ dayOfMonth: 15 })]);

    const result = await service.generateDuePendings(new Date('2026-02-28T12:00:00Z'));

    expect(result).toEqual({ checked: 1, created: 0 });
    expect(mocks.scheduleFindMany).toHaveBeenCalledWith({ where: { isActive: true } });
    expect(mocks.pendingUpsert).not.toHaveBeenCalled();
  });

  it('confirmar pendencia executa BridgeService com bridgeId duravel e marca concluida', async () => {
    mocks.pendingFindUnique.mockResolvedValue(pending());
    mocks.workspaceMemberFindUnique
      .mockResolvedValueOnce(owner(10, 'BUSINESS'))
      .mockResolvedValueOnce(owner(20, 'PERSONAL'));
    mocks.pendingUpdateMany.mockResolvedValue({ count: 1 });
    bridgeService.executeTransfer.mockResolvedValue({ debitTx: { id: 'd' }, creditTx: { id: 'c' } });
    mocks.pendingUpdate.mockResolvedValue(pending({ status: 'COMPLETED' }));

    await service.confirmPending(7, 'pending-1');

    expect(bridgeService.executeTransfer).toHaveBeenCalledWith(7, expect.objectContaining({
      fromWorkspaceId: 10,
      toWorkspaceId: 20,
      amount: 1500,
      bridgeId: 'RPL_pending-1_2026-02',
    }));
    expect(mocks.pendingUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'pending-1' },
      data: expect.objectContaining({ status: 'COMPLETED', confirmedByUserId: 7 }),
    }));
  });

  it('confirmar pendencia concluida nao duplica transferencia', async () => {
    mocks.pendingFindUnique.mockResolvedValue(pending({ status: 'COMPLETED' }));
    mocks.workspaceMemberFindUnique
      .mockResolvedValueOnce(owner(10, 'BUSINESS'))
      .mockResolvedValueOnce(owner(20, 'PERSONAL'));

    await service.confirmPending(7, 'pending-1');

    expect(bridgeService.executeTransfer).not.toHaveBeenCalled();
    expect(mocks.pendingUpdateMany).not.toHaveBeenCalled();
  });

  it('saldo insuficiente mantem pendencia aberta e registra erro seguro', async () => {
    mocks.pendingFindUnique.mockResolvedValue(pending());
    mocks.workspaceMemberFindUnique
      .mockResolvedValueOnce(owner(10, 'BUSINESS'))
      .mockResolvedValueOnce(owner(20, 'PERSONAL'));
    mocks.pendingUpdateMany.mockResolvedValue({ count: 1 });
    bridgeService.executeTransfer.mockRejectedValue({ statusCode: 400, message: 'Saldo insuficiente na conta de origem.' });

    await expect(service.confirmPending(7, 'pending-1')).rejects.toMatchObject({ statusCode: 400 });

    expect(mocks.pendingUpdate).toHaveBeenCalledWith({
      where: { id: 'pending-1' },
      data: expect.objectContaining({
        processingStartedAt: null,
        processingByUserId: null,
        lastError: 'Saldo insuficiente na conta de origem.',
      }),
    });
  });

  it('desativar agendamento preserva historico e impede futuras geracoes pelo filtro isActive', async () => {
    mocks.scheduleFindUnique.mockResolvedValue(schedule());
    mocks.workspaceMemberFindUnique
      .mockResolvedValueOnce(owner(10, 'BUSINESS'))
      .mockResolvedValueOnce(owner(20, 'PERSONAL'));
    mocks.scheduleUpdate.mockResolvedValue(schedule({ isActive: false }));

    await service.deactivateSchedule(7, 'schedule-1');

    expect(mocks.scheduleUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'schedule-1' },
      data: expect.objectContaining({ isActive: false, deactivatedByUserId: 7 }),
    }));
  });
});
