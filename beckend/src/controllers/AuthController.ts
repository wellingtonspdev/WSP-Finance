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
    });

    const { name, email, password } = registerBodySchema.parse(req.body);

    try {
      const result = await this.authService.register(name, email, password);
      
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
}