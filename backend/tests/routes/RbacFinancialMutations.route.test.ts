import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/server';
import { getJwtSecret } from '../../src/config/authEnv';

const mocks = vi.hoisted(() => ({
  currentRole: 'OWNER',
  mockTransactionCreate: vi.fn(),
  mockTransactionDelete: vi.fn(),
  mockImportOFX: vi.fn(),
  mockBankMovementApprove: vi.fn(),
  mockBankMovementReject: vi.fn(),
  mockBankMovementMerge: vi.fn(),
}));

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    workspaceMember: {
      findUnique: vi.fn(async () => ({
        id: 1,
        userId: 100,
        workspaceId: 1,
        role: mocks.currentRole,
        workspace: { type: 'BUSINESS' },
      })),
    },
  },
  sysPrisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock('../../src/lib/tenantContext', () => ({
  tenantContext: {
    getStore: vi.fn(() => ({
      currentWorkspaceId: 1,
      userRole: mocks.currentRole,
      workspaceType: 'BUSINESS',
    })),
    run: vi.fn((_store: any, fn: () => unknown) => fn()),
  },
}));

vi.mock('../../src/services/TransactionService', () => ({
  TransactionService: class {
    create = mocks.mockTransactionCreate;
    delete = mocks.mockTransactionDelete;
    list = vi.fn();
    listAllByUser = vi.fn();
    getById = vi.fn();
  },
}));

vi.mock('../../src/services/ImportService', () => ({
  ImportService: class {
    importOFX = mocks.mockImportOFX;
  },
}));

vi.mock('../../src/services/BankMovementService', () => ({
  BankMovementService: class {
    approve = mocks.mockBankMovementApprove;
    reject = mocks.mockBankMovementReject;
    merge = mocks.mockBankMovementMerge;
    listPending = vi.fn();
    listGlobalPending = vi.fn();
  },
}));

vi.mock('../../src/lib/checkEnvironment', () => ({
  checkPrivileges: vi.fn(),
}));

vi.mock('../../src/services/AuditLogService', () => ({
  AuditLogService: {
    logSync: vi.fn(),
    logAsync: vi.fn(),
  },
}));

const JWT_SECRET = getJwtSecret();
const movementId = '00000000-0000-4000-8000-000000000001';

function makeToken(userId = 100) {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: '1h' });
}

function setRole(role: 'OWNER' | 'EDITOR' | 'ACCOUNTANT' | 'VIEWER') {
  mocks.currentRole = role;
}

function authorizedRequest(method: 'post' | 'delete', url: string) {
  return request(app)[method](url)
    .set('Authorization', `Bearer ${makeToken()}`)
    .set('x-workspace-id', '1');
}

describe('financial mutation RBAC route guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRole('OWNER');
    mocks.mockTransactionCreate.mockResolvedValue({ id: 'tx-1' });
    mocks.mockBankMovementApprove.mockResolvedValue({ id: 'tx-approved' });
    mocks.mockBankMovementReject.mockResolvedValue({ id: movementId, status: 'REJECTED' });
    mocks.mockBankMovementMerge.mockResolvedValue({ id: movementId });
    mocks.mockImportOFX.mockResolvedValue({ created: 0 });
  });

  it.each([
    ['ACCOUNTANT'],
    ['VIEWER'],
  ] as const)('%s nao cria Transaction', async (role) => {
    setRole(role);

    const res = await authorizedRequest('post', '/transactions')
      .send({
        description: 'Blocked mutation',
        amount: 10,
        date: '2026-05-01',
        type: 'EXPENSE',
        categoryId: 1,
        isPaid: true,
      });

    expect(res.status).toBe(403);
    expect(mocks.mockTransactionCreate).not.toHaveBeenCalled();
  });

  it.each([
    ['ACCOUNTANT'],
    ['VIEWER'],
  ] as const)('%s nao deleta Transaction', async (role) => {
    setRole(role);

    const res = await authorizedRequest('delete', '/transactions/00000000-0000-4000-8000-000000000002');

    expect(res.status).toBe(403);
    expect(mocks.mockTransactionDelete).not.toHaveBeenCalled();
  });

  it.each([
    ['approve', '/bank-movements/00000000-0000-4000-8000-000000000001/approve', mocks.mockBankMovementApprove],
    ['reject', '/bank-movements/00000000-0000-4000-8000-000000000001/reject', mocks.mockBankMovementReject],
    ['merge', '/bank-movements/00000000-0000-4000-8000-000000000001/merge', mocks.mockBankMovementMerge],
  ])('ACCOUNTANT nao executa BankMovement %s', async (_label, url, serviceMock) => {
    setRole('ACCOUNTANT');

    const res = await authorizedRequest('post', url)
      .send({ categoryId: 1, keepId: movementId, discardIds: ['00000000-0000-4000-8000-000000000003'] });

    expect(res.status).toBe(403);
    expect(serviceMock).not.toHaveBeenCalled();
  });

  it('ACCOUNTANT nao importa OFX', async () => {
    setRole('ACCOUNTANT');

    const res = await authorizedRequest('post', '/transactions/import')
      .send({ fileName: 'statement.ofx', accountId: 1 });

    expect(res.status).toBe(403);
    expect(mocks.mockImportOFX).not.toHaveBeenCalled();
  });

  it('OWNER mantem criacao de Transaction permitida', async () => {
    setRole('OWNER');

    const res = await authorizedRequest('post', '/transactions')
      .send({
        description: 'Allowed mutation',
        amount: 10,
        date: '2026-05-01',
        type: 'EXPENSE',
        categoryId: 1,
        isPaid: true,
      });

    expect(res.status).toBe(201);
    expect(mocks.mockTransactionCreate).toHaveBeenCalledTimes(1);
  });

  it('EDITOR mantem criacao de Transaction permitida', async () => {
    setRole('EDITOR');

    const res = await authorizedRequest('post', '/transactions')
      .send({
        description: 'Allowed editor mutation',
        amount: 10,
        date: '2026-05-01',
        type: 'EXPENSE',
        categoryId: 1,
        isPaid: true,
      });

    expect(res.status).toBe(201);
    expect(mocks.mockTransactionCreate).toHaveBeenCalledTimes(1);
  });
});
