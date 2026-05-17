import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExportController } from '../../src/controllers/ExportController';
import { Request, Response } from 'express';
import request from 'supertest';
import { app } from '../../src/server';
import jwt from 'jsonwebtoken';
import { prisma } from '../../src/lib/prisma';

// Mock prisma for RBAC middleware testing
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    workspaceMember: {
      findUnique: vi.fn(),
    },
    // We don't want to mock everything for the actual validation tests, but since ExportValidationService is mocked anyway below, it's fine.
  },
  sysPrisma: {},
}));

// Mock the ExportValidationService
vi.mock('../../src/services/ExportValidationService', () => {
  return {
    ExportValidationService: class {
      validate = vi.fn().mockResolvedValue({
        valid: true,
        layoutId: 'dominio-separated-v1',
        totalRecords: 3,
        warnings: [],
        blockers: [],
        summary: { warningsCount: 0, blockersCount: 0 },
      });
    },
  };
});

describe('ExportController - POST /export/validate', () => {
  let controller: ExportController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    controller = new ExportController();
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock, send: vi.fn() });
    res = { status: statusMock };
  });

  // =====================================================================
  // C01 — Payload válido retorna 200
  // =====================================================================
  it('C01 - payload válido retorna 200', async () => {
    req = {
      body: {
        layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      },
      workspaceId: 1,
    } as any;

    await controller.validate(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        valid: true,
        layoutId: 'dominio-separated-v1',
      }),
    );
  });

  // =====================================================================
  // C02 — layoutId ausente
  // =====================================================================
  it('C02 - layoutId ausente => 400', async () => {
    req = {
      body: {
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      },
      workspaceId: 1,
    } as any;

    await controller.validate(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  // =====================================================================
  // C03 — layoutId string vazia
  // =====================================================================
  it('C03 - layoutId string vazia => 400', async () => {
    req = {
      body: {
        layoutId: '',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      },
      workspaceId: 1,
    } as any;

    await controller.validate(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  // =====================================================================
  // C04 — startDate ausente
  // =====================================================================
  it('C04 - startDate ausente => 400', async () => {
    req = {
      body: {
        layoutId: 'dominio-separated-v1',
        endDate: '2026-05-31',
      },
      workspaceId: 1,
    } as any;

    await controller.validate(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  // =====================================================================
  // C05 — endDate ausente
  // =====================================================================
  it('C05 - endDate ausente => 400', async () => {
    req = {
      body: {
        layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01',
      },
      workspaceId: 1,
    } as any;

    await controller.validate(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  // =====================================================================
  // C06 — startDate formato inválido
  // =====================================================================
  it('C06 - startDate formato inválido => 400', async () => {
    req = {
      body: {
        layoutId: 'dominio-separated-v1',
        startDate: 'invalid-date',
        endDate: '2026-05-31',
      },
      workspaceId: 1,
    } as any;

    await controller.validate(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  // =====================================================================
  // C07 — endDate formato inválido
  // =====================================================================
  it('C07 - endDate formato inválido => 400', async () => {
    req = {
      body: {
        layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01',
        endDate: 'not-a-date',
      },
      workspaceId: 1,
    } as any;

    await controller.validate(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  // =====================================================================
  // C08 — startDate > endDate
  // =====================================================================
  it('C08 - startDate > endDate => 400', async () => {
    req = {
      body: {
        layoutId: 'dominio-separated-v1',
        startDate: '2026-06-01',
        endDate: '2026-05-01',
      },
      workspaceId: 1,
    } as any;

    await controller.validate(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  // =====================================================================
  // C13 — startDate com data impossível (ex: 2026-02-31)
  // =====================================================================
  it('C13 - startDate = 2026-02-31 => 400', async () => {
    req = {
      body: {
        layoutId: 'dominio-separated-v1',
        startDate: '2026-02-31',
        endDate: '2026-05-31',
      },
      workspaceId: 1,
    } as any;

    await controller.validate(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  // =====================================================================
  // C14 — endDate com data impossível (ex: 2026-04-31)
  // =====================================================================
  it('C14 - endDate = 2026-04-31 => 400', async () => {
    req = {
      body: {
        layoutId: 'dominio-separated-v1',
        startDate: '2026-04-01',
        endDate: '2026-04-31',
      },
      workspaceId: 1,
    } as any;

    await controller.validate(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  // =====================================================================
  // C15 — startDate 29 de fevereiro em ano não bissexto (2026-02-29)
  // =====================================================================
  it('C15 - startDate = 2026-02-29 => 400', async () => {
    req = {
      body: {
        layoutId: 'dominio-separated-v1',
        startDate: '2026-02-29',
        endDate: '2026-05-31',
      },
      workspaceId: 1,
    } as any;

    await controller.validate(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  // =====================================================================
  // C16 — startDate 29 de fevereiro em ano bissexto (2028-02-29)
  // =====================================================================
  it('C16 - startDate = 2028-02-29 => 200', async () => {
    req = {
      body: {
        layoutId: 'dominio-separated-v1',
        startDate: '2028-02-29',
        endDate: '2028-05-31',
      },
      workspaceId: 1,
    } as any;

    await controller.validate(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);
  });

  // =====================================================================
  // C09 — workspaceId ausente
  // =====================================================================
  it('C09 - workspaceId ausente => 400', async () => {
    req = {
      body: {
        layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      },
    } as any;

    await controller.validate(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  // =====================================================================
  // C10 — body extra fields ignorados
  // =====================================================================
  it('C10 - body extra fields são ignorados', async () => {
    req = {
      body: {
        layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
        evilField: '<script>alert(1)</script>',
        __proto__: { isAdmin: true },
      },
      workspaceId: 1,
    } as any;

    await controller.validate(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);

    // evilField should not appear in the response
    const responseBody = jsonMock.mock.calls[0][0];
    expect(responseBody).not.toHaveProperty('evilField');
    expect(JSON.stringify(responseBody)).not.toContain('script');
  });

  // =====================================================================
  // C11 — Resposta contém shape esperado
  // =====================================================================
  it('C11 - resposta contém shape esperado', async () => {
    req = {
      body: {
        layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      },
      workspaceId: 1,
    } as any;

    await controller.validate(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);

    const responseBody = jsonMock.mock.calls[0][0];
    expect(responseBody).toHaveProperty('valid');
    expect(responseBody).toHaveProperty('layoutId');
    expect(responseBody).toHaveProperty('totalRecords');
    expect(responseBody).toHaveProperty('warnings');
    expect(responseBody).toHaveProperty('blockers');
    expect(responseBody).toHaveProperty('summary');
    expect(responseBody.summary).toHaveProperty('warningsCount');
    expect(responseBody.summary).toHaveProperty('blockersCount');
  });

  // =====================================================================
  // C12 — Service error => 500 genérico
  // =====================================================================
  it('C12 - service error => 500 genérico sem stack trace', async () => {
    const service = (controller as any).validationService;
    service.validate = vi.fn().mockRejectedValue(new Error('DB connection lost'));

    req = {
      body: {
        layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      },
      workspaceId: 1,
    } as any;

    await controller.validate(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(500);

    const responseBody = jsonMock.mock.calls[0][0];
    expect(responseBody).toEqual(
      expect.objectContaining({
        status: 'error',
        message: expect.any(String),
      }),
    );
    // Must NOT leak error details
    expect(JSON.stringify(responseBody)).not.toContain('DB connection lost');
    expect(JSON.stringify(responseBody)).not.toContain('Error');
    expect(JSON.stringify(responseBody)).not.toContain('stack');
  });
});

describe('POST /export/validate - RBAC Middleware Chain', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';
  const userId = 999;
  const wsId = 10;
  let token: string;

  beforeEach(() => {
    vi.clearAllMocks();
    token = jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: '1h' });
  });

  function mockMembership(role: string) {
    (prisma.workspaceMember.findUnique as any).mockResolvedValue({
      id: 1,
      userId,
      workspaceId: wsId,
      role,
      workspace: { type: 'BUSINESS' },
    });
  }

  const validPayload = {
    layoutId: 'dominio-separated-v1',
    startDate: '2026-05-01',
    endDate: '2026-05-31',
  };

  it('R01 - OWNER consegue validar => 200', async () => {
    mockMembership('OWNER');
    const res = await request(app)
      .post('/export/validate')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(wsId))
      .send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  it('R02 - ACCOUNTANT consegue validar => 200', async () => {
    mockMembership('ACCOUNTANT');
    const res = await request(app)
      .post('/export/validate')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(wsId))
      .send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  it('R03 - EDITOR recebe 403', async () => {
    mockMembership('EDITOR');
    const res = await request(app)
      .post('/export/validate')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(wsId))
      .send(validPayload);

    expect(res.status).toBe(403);
  });

  it('R04 - VIEWER recebe 403', async () => {
    mockMembership('VIEWER');
    const res = await request(app)
      .post('/export/validate')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(wsId))
      .send(validPayload);

    expect(res.status).toBe(403);
  });
});
