import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

import { AdminController } from '../../controllers/AdminController';
import { AdminService } from '../../services/AdminService';

const mockGetGlobalMetrics = vi.fn();

// Criamos um mock da instância de AdminService
const mockAdminService = {
  getGlobalMetrics: mockGetGlobalMetrics,
} as unknown as AdminService;

describe('AdminController', () => {
  let controller: AdminController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  const fakeMetrics = {
    platform: {
      totalUsers: 42,
      totalWorkspaces: 10,
      totalAdmins: 3,
    },
    activity: {
      totalTransactions: 500,
      pendingMovements: 7,
      pendingInvites: 2,
    },
    generatedAt: '2026-05-03T12:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AdminController(mockAdminService);

    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  it('retorna 200 com PlatformMetrics quando service responde', async () => {
    mockGetGlobalMetrics.mockResolvedValue(fakeMetrics);

    await controller.getMetrics(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(fakeMetrics);
  });

  it('delega ao AdminService.getGlobalMetrics()', async () => {
    mockGetGlobalMetrics.mockResolvedValue(fakeMetrics);

    await controller.getMetrics(mockReq as Request, mockRes as Response);

    expect(mockGetGlobalMetrics).toHaveBeenCalledTimes(1);
    expect(mockGetGlobalMetrics).toHaveBeenCalledWith();
  });

  it('retorna 500 quando service lança erro', async () => {
    mockGetGlobalMetrics.mockRejectedValue(new Error('DB falhou'));

    await controller.getMetrics(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) })
    );
  });

  it('NÃO acessa req.workspaceId', async () => {
    mockGetGlobalMetrics.mockResolvedValue(fakeMetrics);
    mockReq.workspaceId = 999;

    await controller.getMetrics(mockReq as Request, mockRes as Response);

    // Controller não deve usar workspaceId
    expect(mockGetGlobalMetrics).toHaveBeenCalledWith();
  });
});
