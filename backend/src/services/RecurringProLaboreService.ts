import { Decimal } from '@prisma/client/runtime/library';
import { AppError } from '../errors/AppError';
import { prisma } from '../lib/prisma';
import { BridgeService } from './BridgeService';

type WorkspaceType = 'BUSINESS' | 'PERSONAL';
type WorkspaceRole = 'OWNER' | 'EDITOR' | 'VIEWER' | 'ACCOUNTANT';
type PendingStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

interface CreateScheduleDTO {
  sourceWorkspaceId: number;
  destinationWorkspaceId: number;
  amount: number;
  dayOfMonth: number;
  description: string;
}

interface ListFilter {
  workspaceId?: number;
}

export class RecurringProLaboreService {
  private readonly db = prisma as any;

  constructor(private readonly bridgeService = new BridgeService()) {}

  private startOfMonth(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  private lastDayOfMonth(year: number, monthIndex: number) {
    return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  }

  private dueDateFor(schedule: { dayOfMonth: number }, date: Date) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = Math.min(schedule.dayOfMonth, this.lastDayOfMonth(year, month));
    return new Date(Date.UTC(year, month, day));
  }

  private normalizeErrorMessage(err: any) {
    return err?.message ? String(err.message).slice(0, 1000) : 'Erro ao confirmar pendencia.';
  }

  private async getOwnerMembership(userId: number, workspaceId: number) {
    return this.db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      include: { workspace: true },
    }) as Promise<({ role: WorkspaceRole; workspace: { id: number; type: WorkspaceType } } | null)>;
  }

  private async assertOwner(userId: number, workspaceId: number) {
    const membership = await this.getOwnerMembership(userId, workspaceId);
    if (!membership || membership.role !== 'OWNER') {
      throw new AppError('Apenas OWNER pode operar pro-labore recorrente neste workspace.', 403);
    }
    return membership;
  }

  private async assertScheduleAccess(userId: number, scheduleId: string) {
    const schedule = await this.db.recurringProLaboreSchedule.findUnique({
      where: { id: scheduleId },
      include: { sourceWorkspace: true, destinationWorkspace: true },
    });

    if (!schedule) {
      throw new AppError('Agendamento de pro-labore nao encontrado.', 404);
    }

    await this.assertOwner(userId, schedule.sourceWorkspaceId);
    await this.assertOwner(userId, schedule.destinationWorkspaceId);
    return schedule;
  }

  private async assertPendingAccess(userId: number, pendingId: string) {
    const pending = await this.db.recurringProLaborePending.findUnique({
      where: { id: pendingId },
      include: {
        schedule: {
          include: { sourceWorkspace: true, destinationWorkspace: true },
        },
      },
    });

    if (!pending) {
      throw new AppError('Pendencia de pro-labore nao encontrada.', 404);
    }

    await this.assertOwner(userId, pending.schedule.sourceWorkspaceId);
    await this.assertOwner(userId, pending.schedule.destinationWorkspaceId);
    return pending;
  }

  async createSchedule(userId: number, dto: CreateScheduleDTO) {
    if (dto.sourceWorkspaceId === dto.destinationWorkspaceId) {
      throw new AppError('Origem e destino devem ser workspaces diferentes.', 400);
    }

    if (dto.dayOfMonth < 1 || dto.dayOfMonth > 31) {
      throw new AppError('Dia do mes deve estar entre 1 e 31.', 400);
    }

    const sourceMembership = await this.assertOwner(userId, dto.sourceWorkspaceId);
    const destinationMembership = await this.assertOwner(userId, dto.destinationWorkspaceId);

    if (sourceMembership.workspace.type !== 'BUSINESS' || destinationMembership.workspace.type !== 'PERSONAL') {
      throw new AppError('Pro-labore recorrente deve sair de workspace BUSINESS e entrar em workspace PERSONAL.', 400);
    }

    return this.db.recurringProLaboreSchedule.create({
      data: {
        sourceWorkspaceId: dto.sourceWorkspaceId,
        destinationWorkspaceId: dto.destinationWorkspaceId,
        amount: new Decimal(dto.amount),
        dayOfMonth: dto.dayOfMonth,
        description: dto.description.trim(),
        createdByUserId: userId,
      },
      include: { sourceWorkspace: true, destinationWorkspace: true },
    });
  }

  async listSchedules(userId: number, filter: ListFilter = {}) {
    const owned = await this.db.workspaceMember.findMany({
      where: { userId, role: 'OWNER' },
      select: { workspaceId: true },
    });
    const workspaceIds = owned.map((membership: { workspaceId: number }) => membership.workspaceId);

    if (filter.workspaceId && !workspaceIds.includes(filter.workspaceId)) {
      throw new AppError('Acesso negado ao workspace informado.', 403);
    }

    const scopedWorkspaceIds = filter.workspaceId ? [filter.workspaceId] : workspaceIds;
    if (scopedWorkspaceIds.length === 0) return [];

    return this.db.recurringProLaboreSchedule.findMany({
      where: {
        OR: [
          { sourceWorkspaceId: { in: scopedWorkspaceIds } },
          { destinationWorkspaceId: { in: scopedWorkspaceIds } },
        ],
      },
      include: { sourceWorkspace: true, destinationWorkspace: true },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async deactivateSchedule(userId: number, scheduleId: string) {
    await this.assertScheduleAccess(userId, scheduleId);

    return this.db.recurringProLaboreSchedule.update({
      where: { id: scheduleId },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedByUserId: userId,
      },
      include: { sourceWorkspace: true, destinationWorkspace: true },
    });
  }

  async listPendings(userId: number, filter: ListFilter = {}) {
    const schedules = await this.listSchedules(userId, filter);
    const scheduleIds = schedules.map((schedule: { id: string }) => schedule.id);
    if (scheduleIds.length === 0) return [];

    return this.db.recurringProLaborePending.findMany({
      where: { scheduleId: { in: scheduleIds } },
      include: {
        schedule: {
          include: { sourceWorkspace: true, destinationWorkspace: true },
        },
      },
      orderBy: [{ competence: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async cancelPending(userId: number, pendingId: string) {
    const pending = await this.assertPendingAccess(userId, pendingId);
    if (pending.status === 'COMPLETED') {
      throw new AppError('Pendencia ja concluida nao pode ser cancelada.', 409);
    }

    return this.db.recurringProLaborePending.update({
      where: { id: pendingId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledByUserId: userId,
      },
    });
  }

  async generateDuePendings(referenceDate = new Date()) {
    const today = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));
    const schedules = await this.db.recurringProLaboreSchedule.findMany({
      where: { isActive: true },
    });

    let created = 0;
    for (const schedule of schedules) {
      const dueDate = this.dueDateFor(schedule, today);
      if (dueDate.getTime() !== today.getTime()) {
        continue;
      }

      const competence = this.startOfMonth(today);
      const result = await this.db.recurringProLaborePending.upsert({
        where: { scheduleId_competence: { scheduleId: schedule.id, competence } },
        update: {},
        create: { scheduleId: schedule.id, competence, status: 'PENDING' as PendingStatus },
      });

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        created++;
      }
    }

    return { checked: schedules.length, created };
  }

  async confirmPending(userId: number, pendingId: string) {
    const pending = await this.assertPendingAccess(userId, pendingId);
    if (pending.status === 'COMPLETED') {
      return pending;
    }
    if (pending.status === 'CANCELLED') {
      throw new AppError('Pendencia cancelada nao pode ser confirmada.', 409);
    }

    const bridgeId = pending.bridgeId || `RPL_${pending.id}_${pending.competence.toISOString().slice(0, 7)}`;
    const claimed = await this.db.recurringProLaborePending.updateMany({
      where: { id: pending.id, status: 'PENDING', bridgeId: pending.bridgeId },
      data: {
        bridgeId,
        processingStartedAt: new Date(),
        processingByUserId: userId,
        lastAttemptAt: new Date(),
        lastError: null,
      },
    });

    if (claimed.count === 0) {
      const current = await this.assertPendingAccess(userId, pendingId);
      if (current.status === 'COMPLETED') {
        return current;
      }
      throw new AppError('Pendencia ja esta em confirmacao. Tente novamente em instantes.', 409);
    }

    try {
      await this.bridgeService.executeTransfer(userId, {
        fromWorkspaceId: pending.schedule.sourceWorkspaceId,
        toWorkspaceId: pending.schedule.destinationWorkspaceId,
        amount: pending.schedule.amount.toNumber(),
        description: pending.schedule.description,
        date: new Date(),
        bridgeId,
      });

      return this.db.recurringProLaborePending.update({
        where: { id: pending.id },
        data: {
          status: 'COMPLETED',
          confirmedAt: new Date(),
          confirmedByUserId: userId,
          processingStartedAt: null,
          processingByUserId: null,
          lastError: null,
        },
        include: {
          schedule: {
            include: { sourceWorkspace: true, destinationWorkspace: true },
          },
        },
      });
    } catch (err: any) {
      await this.db.recurringProLaborePending.update({
        where: { id: pending.id },
        data: {
          processingStartedAt: null,
          processingByUserId: null,
          lastAttemptAt: new Date(),
          lastError: this.normalizeErrorMessage(err),
        },
      });
      throw err;
    }
  }
}
