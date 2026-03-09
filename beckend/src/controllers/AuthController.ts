import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/AuthService';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // --- Handler: Registro ---
  async register(req: Request, res: Response) {
    const registerBodySchema = z.object({
      name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
      email: z.string().email('E-mail inválido'),
      password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
      type: z.enum(['CLIENT', 'ACCOUNTANT']).optional().default('CLIENT'),
    });

    const { name, email, password, type } = registerBodySchema.parse(req.body);

    try {
      const result = await this.authService.register(name, email, password, type);

      // Retorna 201 Created com mensagem de instrução
      return res.status(201).json(result);
    } catch (err: any) {
      if (err.message === 'User already exists') {
        return res.status(409).json({ message: err.message });
      }
      throw err;
    }
  }

  // --- Handler: Login ---
  async authenticate(req: Request, res: Response) {
    const authBodySchema = z.object({
      email: z.string().email(),
      password: z.string(),
    });

    const { email, password } = authBodySchema.parse(req.body);

    try {
      const { user, token, refreshToken } = await this.authService.authenticate(email, password);

      return res.status(200).json({
        user,
        token,
        refreshToken
      });
    } catch (err: any) {
      if (err.message === 'Invalid credentials') {
        return res.status(401).json({ message: err.message });
      }
      if (err.message === 'Email not verified') {
        return res.status(403).json({ message: 'E-mail não verificado. Por favor, ative sua conta.' });
      }
      throw err;
    }
  }

  // --- Handler: Refresh Token ---
  async refresh(req: Request, res: Response) {
    const refreshBodySchema = z.object({
      refreshToken: z.string().uuid('Token inválido'),
    });

    const { refreshToken } = refreshBodySchema.parse(req.body);

    try {
      const result = await this.authService.refreshToken(refreshToken);
      return res.status(200).json(result);
    } catch (err: any) {
      if (err.message === 'Refresh token invalid' || err.message === 'Refresh token expired') {
        return res.status(401).json({ message: 'Sessão expirada ou inválida' });
      }
      throw err;
    }
  }

  // --- Handler: Get Me (Sincronização Pós-F5) ---
  async me(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const userData = await this.authService.getMe(userId);
      return res.status(200).json(userData);
    } catch (err: any) {
      if (err.message === 'User not found') {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      throw err;
    }
  }
}