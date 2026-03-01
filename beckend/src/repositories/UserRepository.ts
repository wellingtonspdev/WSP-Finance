import { prisma } from '../lib/prisma';
import { Prisma, User, RefreshToken, PasswordResetToken, AccountVerificationToken } from '@prisma/client';

export class UserRepository {
  // Cria Usuário e Workspace Pessoal em uma única transação atômica
  async createWithWorkspace(data: Prisma.UserCreateInput): Promise<User> {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Cria o usuário
        const user = await tx.user.create({
          data: {
            name: data.name,
            email: data.email,
            passwordHash: data.passwordHash,
            // Não criamos o workspace aninhado aqui mais, pois a relação mudou
          }
        });

        // 2. Cria o Workspace Pessoal
        const workspace = await tx.workspace.create({
          data: {
            name: 'Meu Workspace Pessoal',
            type: 'PERSONAL',
            // Sem userId direto
          }
        });

        // 3. Cria o vínculo de Membro (OWNER)
        await tx.workspaceMember.create({
          data: {
            userId: user.id,
            workspaceId: workspace.id,
            role: 'OWNER'
          }
        });

        return user;
      });
    } catch (error) {
      console.error("Erro ao criar usuário com workspace:", error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({ where: { email } });
  }

  async findByEmailWithWorkspaces(email: string) {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            workspace: true
          }
        }
      }
    });
  }

  async findById(id: number): Promise<User | null> {
    return await prisma.user.findUnique({ where: { id } });
  }

  async updatePassword(userId: number, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });
  }

  async markEmailAsVerified(userId: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() }
    });
  }

  // --- Gestão de Refresh Tokens ---

  async createRefreshToken(userId: number, expiresIn: number): Promise<RefreshToken> {
    return await prisma.refreshToken.create({
      data: {
        userId,
        expiresIn
      }
    });
  }

  async findRefreshTokenById(id: string): Promise<RefreshToken | null> {
    return await prisma.refreshToken.findUnique({ where: { id } });
  }

  async deleteRefreshToken(id: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { id } });
  }

  async deleteRefreshTokensByUserId(userId: number): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }

  // --- Gestão de Password Reset Tokens ---

  async createPasswordResetToken(userId: number, code: string, expiresAt: Date): Promise<PasswordResetToken> {
    return await prisma.passwordResetToken.create({
      data: {
        userId,
        code,
        expiresAt
      }
    });
  }

  async findValidResetToken(userId: number, code: string): Promise<PasswordResetToken | null> {
    return await prisma.passwordResetToken.findFirst({
      where: {
        userId,
        code,
        used: false,
        expiresAt: {
          gt: new Date()
        }
      }
    });
  }

  async markTokenAsUsed(tokenId: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { used: true }
    });
  }

  // --- Gestão de Account Verification Tokens ---

  async createVerificationToken(userId: number, code: string, expiresAt: Date): Promise<AccountVerificationToken> {
    return await prisma.accountVerificationToken.create({
      data: {
        userId,
        code,
        expiresAt
      }
    });
  }

  async findValidVerificationToken(userId: number, code: string): Promise<AccountVerificationToken | null> {
    return await prisma.accountVerificationToken.findFirst({
      where: {
        userId,
        code,
        expiresAt: {
          gt: new Date()
        }
      }
    });
  }

  async deleteVerificationToken(tokenId: string): Promise<void> {
    await prisma.accountVerificationToken.deleteMany({
      where: { id: tokenId }
    });
  }
}