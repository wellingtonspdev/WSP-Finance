import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/server';
import { getJwtSecret } from '../../src/config/authEnv';

const serviceMocks = vi.hoisted(() => ({
  createSchedule: vi.fn(),
  listSchedules: vi.fn(),
  deactivateSchedule: vi.fn(),
  listPendings: vi.fn(),
  confirmPending: vi.fn(),
  cancelPending: vi.fn(),
}));

vi.mock('../../src/services/RecurringProLaboreService', () => ({
  RecurringProLaboreService: class {
    createSchedule = serviceMocks.createSchedule;
    listSchedules = serviceMocks.listSchedules;
    deactivateSchedule = serviceMocks.deactivateSchedule;
    listPendings = serviceMocks.listPendings;
    confirmPending = serviceMocks.confirmPending;
    cancelPending = serviceMocks.cancelPending;
  },
}));

vi.mock('../../src/lib/prisma', () => ({
  prisma: {},
  sysPrisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock('../../src/lib/checkEnvironment', () => ({
  checkPrivileges: vi.fn(),
}));

function token(userId: number) {
  return jwt.sign({ sub: String(userId) }, getJwtSecret(), { expiresIn: '1h' });
}

describe('RecurringProLabore routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /recurring-pro-labore/schedules valida DTO e cria agendamento', async () => {
    serviceMocks.createSchedule.mockResolvedValue({ id: 'schedule-1' });

    const response = await request(app)
      .post('/recurring-pro-labore/schedules')
      .set('Authorization', `Bearer ${token(7)}`)
      .send({
        sourceWorkspaceId: 10,
        destinationWorkspaceId: 20,
        amount: 1500,
        dayOfMonth: 5,
        description: 'Pro-labore mensal',
      });

    expect(response.status).toBe(201);
    expect(serviceMocks.createSchedule).toHaveBeenCalledWith(7, expect.objectContaining({
      sourceWorkspaceId: 10,
      destinationWorkspaceId: 20,
      amount: 1500,
    }));
  });

  it('GET /recurring-pro-labore/pending lista pendencias por workspace explicito', async () => {
    serviceMocks.listPendings.mockResolvedValue([{ id: 'pending-1' }]);

    const response = await request(app)
      .get('/recurring-pro-labore/pending?workspaceId=10')
      .set('Authorization', `Bearer ${token(7)}`);

    expect(response.status).toBe(200);
    expect(response.body.pendings).toEqual([{ id: 'pending-1' }]);
    expect(serviceMocks.listPendings).toHaveBeenCalledWith(7, { workspaceId: 10 });
  });

  it('POST /recurring-pro-labore/pending/:id/confirm confirma manualmente', async () => {
    serviceMocks.confirmPending.mockResolvedValue({ id: 'pending-1', status: 'COMPLETED' });

    const response = await request(app)
      .post('/recurring-pro-labore/pending/pending-1/confirm')
      .set('Authorization', `Bearer ${token(7)}`);

    expect(response.status).toBe(200);
    expect(serviceMocks.confirmPending).toHaveBeenCalledWith(7, 'pending-1');
  });
});
