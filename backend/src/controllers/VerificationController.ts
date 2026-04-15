import { Request, Response } from 'express';
import { z } from 'zod';
import { VerificationService } from '../services/VerificationService';

export class VerificationController {
  private verificationService: VerificationService;

  constructor() {
    this.verificationService = new VerificationService();
  }

  async verify(req: Request, res: Response) {
    const verifySchema = z.object({
      email: z.string().email(),
      code: z.string().length(6, 'O código deve ter 6 dígitos'),
    });

    const { email, code } = verifySchema.parse(req.body);

    try {
      await this.verificationService.verifyAccount(email, code);
      return res.status(200).json({ message: 'Account verified successfully' });
    } catch (err: any) {
      if (err.message === 'Invalid or expired token' || err.message === 'User not found') {
        return res.status(400).json({ message: 'Código inválido ou expirado.' });
      }
      throw err;
    }
  }

  async resend(req: Request, res: Response) {
    const resendSchema = z.object({
      email: z.string().email(),
    });

    const { email } = resendSchema.parse(req.body);

    try {
      await this.verificationService.resendVerification(email);
      // Sempre retorna sucesso (200) para não vazar e-mails
      return res.status(200).json({ message: 'If the email exists, a new code has been sent.' });
    } catch (err: any) {
      if (err.message === 'Account already verified') {
        return res.status(400).json({ message: 'Esta conta já está verificada.' });
      }
      throw err;
    }
  }
}