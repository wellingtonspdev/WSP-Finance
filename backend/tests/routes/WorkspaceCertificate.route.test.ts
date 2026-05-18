import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server';
import jwt from 'jsonwebtoken';
import { prisma } from '../../src/lib/prisma';
import { WorkspaceService } from '../../src/services/WorkspaceService';

// Mock do prisma — precisa cobrir WorkspaceMiddleware + RbacMiddleware
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    workspaceMember: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/WorkspaceService');

import { getJwtSecret } from '../../src/config/authEnv';

const JWT_SECRET = getJwtSecret();

function makeToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: '1h' });
}

/** Mock padrão: OWNER com acesso */
function mockOwnerMembership(userId: number, workspaceId: number) {
  (prisma.workspaceMember.findUnique as any).mockResolvedValue({
    id: 1,
    userId,
    workspaceId,
    role: 'OWNER',
    workspace: { type: 'BUSINESS' },
  });
}

describe('POST /workspaces/:id/certificate-a1', () => {
  const userId = 999;
  const wsId = 10;
  let token: string;

  beforeEach(() => {
    vi.clearAllMocks();
    token = makeToken(userId);
    mockOwnerMembership(userId, wsId);
  });

  // --- 400 ---

  it('retorna 400 se nenhum arquivo for enviado', async () => {
    const res = await request(app)
      .post(`/workspaces/${wsId}/certificate-a1`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(wsId))
      .field('password', '12345');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Arquivo do certificado');
  });

  it('retorna 400 se a senha não for enviada', async () => {
    const res = await request(app)
      .post(`/workspaces/${wsId}/certificate-a1`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(wsId))
      .attach('certificate', Buffer.from('mock'), 'cert.pfx');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Senha do certificado');
  });

  it('retorna 400 se a extensão do arquivo for inválida', async () => {
    const res = await request(app)
      .post(`/workspaces/${wsId}/certificate-a1`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(wsId))
      .field('password', '12345')
      .attach('certificate', Buffer.from('data'), 'cert.zip');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Extensão inválida');
  });

  // --- 403 ---

  it('retorna 403 se o usuário não for OWNER', async () => {
    (prisma.workspaceMember.findUnique as any).mockResolvedValue({
      id: 1,
      userId,
      workspaceId: wsId,
      role: 'EDITOR',
      workspace: { type: 'BUSINESS' },
    });

    const res = await request(app)
      .post(`/workspaces/${wsId}/certificate-a1`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(wsId))
      .field('password', '12345')
      .attach('certificate', Buffer.from('mock'), 'cert.pfx');

    expect(res.status).toBe(403);
  });

  // --- 422 ---

  it('retorna 422 quando o service lança erro de certificado', async () => {
    vi.spyOn(WorkspaceService.prototype, 'uploadCertificate')
      .mockRejectedValue(new Error('Senha incorreta ou arquivo PFX/P12 inválido.'));

    const res = await request(app)
      .post(`/workspaces/${wsId}/certificate-a1`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(wsId))
      .field('password', 'wrong')
      .attach('certificate', Buffer.from('mock'), 'cert.pfx');

    expect(res.status).toBe(422);
    expect(res.body.message).toContain('Senha incorreta');
  });

  // --- 200 ---

  it('retorna 200 com payload direto do service em caso de sucesso', async () => {
    const payload = {
      workspaceId: wsId,
      certificateExpiresAt: '2027-05-10T23:59:59.000Z',
      expiresInDays: 384,
      alertLevel: 'ok',
    };

    vi.spyOn(WorkspaceService.prototype, 'uploadCertificate')
      .mockResolvedValue(payload as any);

    const res = await request(app)
      .post(`/workspaces/${wsId}/certificate-a1`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(wsId))
      .field('password', '12345')
      .attach('certificate', Buffer.from('mock'), 'cert.pfx');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(payload);
  });
});
