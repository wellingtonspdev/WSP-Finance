import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { VerificationService } from './VerificationService';

export class AuthService {
  private userRepository: UserRepository;
  private verificationService: VerificationService;
  private JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

  constructor() {
    this.userRepository = new UserRepository();
    this.verificationService = new VerificationService();
  }

  // --- Caso de Uso: Registro ---
  async register(name: string, email: string, password: string, type: 'CLIENT' | 'ACCOUNTANT' = 'CLIENT') {
    const userExists = await this.userRepository.findByEmail(email);
    if (userExists) {
      throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 8);

    // 1. Cria o usuário (ainda não verificado)
    const user = await this.userRepository.createWithWorkspace({
      name,
      email,
      passwordHash,
      type,
    });

    // LOG PARA DEBUG mantido fora de workspace legado
    console.log(`🔑 [DEBUG] User Registration Initiated: ${user.email}`);

    // 2. Envia o e-mail de verificação
    await this.verificationService.sendVerificationCode(user.id, user.email, user.name);

    // Retorna o usuário, mas SEM tokens de sessão
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      message: 'Account created. Please check your email to verify your account.'
    };
  }

  // --- Caso de Uso: Login ---
  async authenticate(email: string, password: string) {
    const user = await this.userRepository.findByEmailWithWorkspaces(email);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // BLOQUEIO: Verifica se o e-mail foi confirmado
    if (!user.emailVerifiedAt) {
      throw new Error('Email not verified');
    }

    const doesPasswordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!doesPasswordMatch) {
      throw new Error('Invalid credentials');
    }

    // Gerar Tokens
    const token = this.generateAccessToken(user.id);
    const refreshToken = await this.generateRefreshToken(user.id);

    // Mapeamento Multi-tenant (Ponte)
    const mappedWorkspaces = user.memberships.map(m => ({
      id: m.workspace.id,
      name: m.workspace.name,
      type: m.workspace.type,
      role: m.role
    }));

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.type,
        memberships: mappedWorkspaces
      },
      token,
      refreshToken: refreshToken.id
    };
  }

  // --- Caso de Uso: Refresh Token ---
  async refreshToken(refreshTokenId: string) {
    const refreshToken = await this.userRepository.findRefreshTokenById(refreshTokenId);

    if (!refreshToken) {
      throw new Error('Refresh token invalid');
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > refreshToken.expiresIn) {
      await this.userRepository.deleteRefreshToken(refreshTokenId);
      throw new Error('Refresh token expired');
    }

    await this.userRepository.deleteRefreshToken(refreshTokenId);

    const newAccessToken = this.generateAccessToken(refreshToken.userId);
    const newRefreshToken = await this.generateRefreshToken(refreshToken.userId);

    return {
      token: newAccessToken,
      refreshToken: newRefreshToken.id
    };
  }

  // --- Caso de Uso: Get Me (Sincronização de Sessão) ---
  async getMe(userId: number) {
    const user = await this.userRepository.findByIdWithWorkspaces(userId);
    if (!user) throw new Error('User not found');

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      type: user.type,
      memberships: user.memberships.map((m: any) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        type: m.workspace.type,
        role: m.role
      }))
    };
  }

  private generateAccessToken(userId: number): string {
    return jwt.sign({}, this.JWT_SECRET, {
      subject: userId.toString(),
      expiresIn: '15m',
    });
  }

  private async generateRefreshToken(userId: number) {
    const expiresIn = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30);
    return await this.userRepository.createRefreshToken(userId, expiresIn);
  }
}