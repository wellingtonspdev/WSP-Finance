import { Request, Response } from 'express';
import { z } from 'zod';
import { CategoryService } from '../services/CategoryService';

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  async create(req: Request, res: Response) {
    const createCategorySchema = z.object({
      name: z.string().min(1),
      icon: z.string().optional(),
      color: z.string().optional(),
      macroCategoryId: z.number().int().positive(),
    });

    const workspaceId = req.workspaceId!;

    try {
      const { name, icon, color, macroCategoryId } = createCategorySchema.parse(req.body);
      const category = await this.categoryService.create(name, icon || '', color || '', workspaceId, macroCategoryId);
      return res.status(201).json(category);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors });
      }
      if (err.message === 'MacroCategory not found or inactive') {
        return res.status(400).json({ message: err.message });
      }
      // Re-throw unexpected errors to be handled by the global error handler
      throw err;
    }
  }

  async list(req: Request, res: Response) {
    const workspaceId = req.workspaceId!;

    const categories = await this.categoryService.list(workspaceId);
    return res.status(200).json(categories);
  }

  async delete(req: Request, res: Response) {
    const deleteParamsSchema = z.object({
      id: z.string().transform((val) => Number(val)), // MUDANÇA: Converte string da URL para number
    });

    const { id } = deleteParamsSchema.parse(req.params);
    const workspaceId = req.workspaceId!;

    try {
      await this.categoryService.delete(id, workspaceId);
      return res.status(204).send();
    } catch (err: any) {
      if (err.message === 'Category not found or cannot be deleted') {
        return res.status(403).json({ message: 'Não é possível deletar esta categoria (Global ou Inexistente).' });
      }
      throw err;
    }
  }
}