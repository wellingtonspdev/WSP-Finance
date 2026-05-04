import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { VerificationService } from './VerificationService';

type UserMembershipWithWorkspace = {
  role: 'OWNER' | 'EDITOR' | 'VIEWER' | 'ACCOUNTANT';
  workspace: {
    id: number;
    name: string;
    type: 'PERSONAL' | 'BUSINESS';
    closedUntil: Date | null;
    certificateExpiresAt: Date | null;
  };
};

type SystemRole = 'USER' | 'ADMIN';

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
    console.log(`[DEBUG] User Registration Initiated: ${user.email}`);

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

    const mappedWorkspaces = this.mapMemberships(user.memberships);
    const dashboardCache = user.type === 'ACCOUNTANT'
      ? await this.loadAccountantCache(user.id, user.memberships.map((membership) => membership.workspace.id))
      : undefined;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.type,
        systemRole: user.systemRole as SystemRole,
        memberships: mappedWorkspaces
      },
      token,
      refreshToken: refreshToken.id,
      ...(dashboardCache !== undefined ? { dashboardCache } : {})
    };
  }

  /**
   * Carrega cache do dashboard do contador.
   * - Se o cache não estiver populado para todos os workspaces atuais, espera a criação sincronamente.
   * - Se já existir para o conjunto esperado, lê do cache (rápido) enquanto o refresh roda em background.
   */
  private async loadAccountantCache(userId: number, expectedWorkspaceIds: number[]) {
    const { AccountantCacheService } = await import('./AccountantCacheService');
    const cacheService = new AccountantCacheService();
    const expectedWorkspaceIdSet = new Set(expectedWorkspaceIds);
    const expectedWorkspaceCount = expectedWorkspaceIdSet.size;

    if (expectedWorkspaceCount === 0) {
      return [];
    }

    let cachedData = await cacheService.getCachedDashboard(userId);
    let scopedCache = this.filterDashboardCache(cachedData, expectedWorkspaceIdSet);

    if (scopedCache.length !== expectedWorkspaceCount) {
      console.log(`[AuthService/AccountantCache] Await Refresh triggered for user ${userId}. Scoped length (${scopedCache.length}) != expected (${expectedWorkspaceCount})`);
      await cacheService.refreshCache(userId);
      cachedData = await cacheService.getCachedDashboard(userId);
      scopedCache = this.filterDashboardCache(cachedData, expectedWorkspaceIdSet);

      if (scopedCache.length !== expectedWorkspaceCount) {
        throw new Error(`Accountant dashboard cache incomplete after refresh for user ${userId}`);
      }
    } else {
      // Fire-and-forget: atualiza no background sem travar o login
      cacheService.refreshCache(userId).catch((err) => {
        console.error(`[AccountantCache] Falha no refresh em background para user ${userId}:`, err);
      });
    }

    return scopedCache;
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

    const mappedMemberships = this.mapMemberships(user.memberships);
    const dashboardCache = user.type === 'ACCOUNTANT'
      ? await this.loadAccountantCache(user.id, user.memberships.map((membership) => membership.workspace.id))
      : undefined;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      type: user.type,
      systemRole: user.systemRole as SystemRole,
      memberships: mappedMemberships,
      ...(dashboardCache !== undefined ? { dashboardCache } : {})
    };
  }

  private mapMemberships(memberships: UserMembershipWithWorkspace[]) {
    return memberships.map((membership) => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      type: membership.workspace.type,
      role: membership.role,
      closedUntil: membership.workspace.closedUntil ?? null,
      certificateExpiresAt: membership.workspace.certificateExpiresAt ?? null
    }));
  }

  private filterDashboardCache<T extends { workspaceId: number }>(
    cachedData: T[],
    expectedWorkspaceIds: Set<number>
  ) {
    return cachedData.filter((entry) => expectedWorkspaceIds.has(entry.workspaceId));
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
