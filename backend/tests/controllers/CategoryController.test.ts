import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoryController } from '../../src/controllers/CategoryController';
import { Request, Response } from 'express';

// Mocar o CategoryService
vi.mock('../../src/services/CategoryService', () => {
  return {
    CategoryService: class {
      create = vi.fn().mockResolvedValue({ id: 1, name: 'Test', macroCategoryId: 10 });
    }
  };
});

describe('CategoryController', () => {
  let categoryController: CategoryController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;

  beforeEach(() => {
    categoryController = new CategoryController();
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock, send: vi.fn() });
    res = { status: statusMock };
  });

  it('controller rejeita payload sem macroCategoryId', async () => {
    req = {
      body: { name: 'Test' }, // faltando macroCategoryId
      workspaceId: 1
    } as any;

    await categoryController.create(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.arrayContaining([
        expect.objectContaining({ message: 'Required' })
      ])
    }));
  });

  it('controller rejeita macroCategoryId = null', async () => {
    req = {
      body: { name: 'Test', macroCategoryId: null },
      workspaceId: 1
    } as any;

    await categoryController.create(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.arrayContaining([
        expect.objectContaining({ message: 'Expected number, received null' })
      ])
    }));
  });

  it('controller rejeita macroCategoryId string', async () => {
    req = {
      body: { name: 'Test', macroCategoryId: "1" },
      workspaceId: 1
    } as any;

    await categoryController.create(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.arrayContaining([
        expect.objectContaining({ message: 'Expected number, received string' })
      ])
    }));
  });

  it('controller rejeita macroCategoryId decimal (1.5)', async () => {
    req = {
      body: { name: 'Test', macroCategoryId: 1.5 },
      workspaceId: 1
    } as any;

    await categoryController.create(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.arrayContaining([
        expect.objectContaining({ message: 'Expected integer, received float' })
      ])
    }));
  });

  it('controller aceita payload válido e chama o service corretamente', async () => {
    req = {
      body: { name: 'Test', icon: 'icon-test', color: '#000', macroCategoryId: 10 },
      workspaceId: 1
    } as any;

    await categoryController.create(req as Request, res as Response);

    // Verificamos que chamou o create do mock corretamente
    const serviceMock = (categoryController as any).categoryService.create;
    expect(serviceMock).toHaveBeenCalledWith('Test', 'icon-test', '#000', 1, 10);

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test',
      macroCategoryId: 10
    }));
  });
});
