import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/server';
import { prisma } from '../../src/lib/prisma';
import { getJwtSecret } from '../../src/config/authEnv';

const mocks = vi.hoisted(() => ({
  currentRole: 'OWNER',
  create: vi.fn(),
  list: vi.fn(),
  getById: vi.fn(),
  markPaid: vi.fn(),
  cancel: vi.fn(),
  uploadGuidePdf: vi.fn(),
  uploadPaymentProof: vi.fn(),
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

vi.mock('../../src/services/TaxGuideService', async () => {
  const actual = await vi.importActual<any>('../../src/services/TaxGuideService');
  return {
    ...actual,
    TaxGuideService: class {
      create = mocks.create;
      list = mocks.list;
      getById = mocks.getById;
      markPaid = mocks.markPaid;
      cancel = mocks.cancel;
      uploadGuidePdf = mocks.uploadGuidePdf;
      uploadPaymentProof = mocks.uploadPaymentProof;
    },
  };
});

vi.mock('../../src/lib/checkEnvironment', () => ({
  checkPrivileges: vi.fn(),
}));

const JWT_SECRET = getJwtSecret();

function makeToken(userId = 100) {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: '1h' });
}

function setRole(role: 'OWNER' | 'EDITOR' | 'ACCOUNTANT' | 'VIEWER') {
  mocks.currentRole = role;
}

function authed(method: 'get' | 'post' | 'patch', url: string) {
  return request(app)[method](url)
    .set('Authorization', `Bearer ${makeToken()}`)
    .set('x-workspace-id', '1');
}

describe('TaxGuide routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRole('OWNER');
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({
      id: 1,
      userId: 100,
      workspaceId: 1,
      role: mocks.currentRole,
      joinedAt: new Date(),
      workspace: { type: 'BUSINESS' },
    } as any);
  });

  it('ACCOUNTANT creates DAS without creating Transaction', async () => {
    setRole('ACCOUNTANT');
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({
      id: 1,
      userId: 100,
      workspaceId: 1,
      role: 'ACCOUNTANT',
      joinedAt: new Date(),
      workspace: { type: 'BUSINESS' },
    } as any);
    mocks.create.mockResolvedValue({ id: 'guide-1', status: 'PENDING' });

    const res = await authed('post', '/tax-guides').send({
      type: 'DAS',
      competenceMonth: 5,
      competenceYear: 2026,
      dueDate: '2026-06-20',
      amount: '123.45',
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 'guide-1', status: 'PENDING' });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 1,
      userId: 100,
      role: 'ACCOUNTANT',
      type: 'DAS',
    }));
  });

  it('VIEWER cannot create a guide', async () => {
    setRole('VIEWER');
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({
      id: 1,
      userId: 100,
      workspaceId: 1,
      role: 'VIEWER',
      joinedAt: new Date(),
      workspace: { type: 'BUSINESS' },
    } as any);

    const res = await authed('post', '/tax-guides').send({
      type: 'DAS_MEI',
      competenceMonth: 5,
      competenceYear: 2026,
      dueDate: '2026-06-20',
      amount: '75.00',
    });

    expect(res.status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('ACCOUNTANT cannot mark paid/link Transaction', async () => {
    setRole('ACCOUNTANT');
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({
      id: 1,
      userId: 100,
      workspaceId: 1,
      role: 'ACCOUNTANT',
      joinedAt: new Date(),
      workspace: { type: 'BUSINESS' },
    } as any);

    const res = await authed('patch', '/tax-guides/guide-1/paid').send({
      paidTransactionId: '00000000-0000-4000-8000-000000000001',
    });

    expect(res.status).toBe(403);
    expect(mocks.markPaid).not.toHaveBeenCalled();
  });

  it('uploads guide PDF through memory upload', async () => {
    mocks.uploadGuidePdf.mockResolvedValue({ id: 'guide-1', hasGuideFile: true });

    const res = await authed('post', '/tax-guides/guide-1/guide-pdf')
      .attach('file', Buffer.from('%PDF-1.4 tax guide'), 'das.pdf');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'guide-1', hasGuideFile: true });
    expect(mocks.uploadGuidePdf).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 1,
      userId: 100,
      role: 'OWNER',
      taxGuideId: 'guide-1',
      originalName: 'das.pdf',
      mimetype: 'application/pdf',
    }));
  });
});
