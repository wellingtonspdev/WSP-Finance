import { Request, Response } from 'express';
import { z } from 'zod';
import { PasswordResetService } from '../services/PasswordResetService';

export class PasswordResetController {
  private passwordResetService: PasswordResetService;

  constructor() {
    this.passwordResetService = new PasswordResetService();
  }

  async forgotPassword(req: Request, res: Response) {
    const forgotPasswordSchema = z.object({
      email: z.string().email('E-mail inválido'),
    });

    const { email } = forgotPasswordSchema.parse(req.body);

    await this.passwordResetService.executeForgotPassword(email);

    // Sempre retorna 204 (No Content) para não vazar informações
    return res.status(204).send();
  }

  async resetPassword(req: Request, res: Response) {
    const resetPasswordSchema = z.object({
      email: z.string().email(),
      code: z.string().length(6, 'O código deve ter 6 dígitos'),
      newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
    });

    const { email, code, newPassword } = resetPasswordSchema.parse(req.body);

    try {
      await this.passwordResetService.executeResetPassword(email, code, newPassword);
      return res.status(204).send();
    } catch (err: any) {
      if (err.message === 'Invalid or expired token' || err.message === 'Invalid credentials') {
        // Retorna 400 Bad Request para erros de negócio conhecidos
        return res.status(400).json({ message: 'Código inválido, expirado ou e-mail incorreto.' });
      }
      throw err;
    }
  }
}