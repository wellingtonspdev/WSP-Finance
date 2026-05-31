import { prisma } from '../lib/prisma';
import crypto from 'crypto';
import { AppError } from '../errors/AppError';

export interface GenerateTokenDTO {
  userId: number;
  defaultWorkspaceId?: number;
  defaultAccountId?: number;
  defaultExpenseCategoryId?: number;
  defaultIncomeCategoryId?: number;
}

export interface TelegramLinkTokenPayload {
  userId: number;
  defaultWorkspaceId?: number;
  defaultAccountId?: number;
  defaultExpenseCategoryId?: number;
  defaultIncomeCategoryId?: number;
}

export class TelegramLinkTokenService {
  private getTTL(): number {
    const ttlStr = process.env.TELEGRAM_LINK_TOKEN_TTL_SECONDS;
    if (ttlStr) {
      const ttl = parseInt(ttlStr, 10);
      if (!isNaN(ttl) && ttl > 0) return ttl;
    }
    return 600; // Default 10 minutes
  }

  // Gera um código numérico de 6 dígitos via crypto seguro
  private generateShortCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  private hashToken(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  public async generateToken(data: GenerateTokenDTO): Promise<{ code: string; expiresAt: Date }> {
    const ttl = this.getTTL();
    const shortCode = this.generateShortCode();
    const codeHash = this.hashToken(shortCode);

    const now = Math.floor(Date.now() / 1000);
    const exp = now + ttl;
    const expiresAt = new Date(exp * 1000);

    // Salva o hash no banco (nunca o código puro)
    await prisma.telegramLinkToken.create({
      data: {
        codeHash,
        attempts: 0,
        maxAttempts: 3,
        userId: data.userId,
        defaultWorkspaceId: data.defaultWorkspaceId,
        defaultAccountId: data.defaultAccountId,
        defaultExpenseCategoryId: data.defaultExpenseCategoryId,
        defaultIncomeCategoryId: data.defaultIncomeCategoryId,
        expiresAt,
      },
    });

    return { code: shortCode, expiresAt };
  }

  public async verifyAndConsumeToken(code: string): Promise<TelegramLinkTokenPayload> {
    const codeHash = this.hashToken(code);
    const now = new Date();

    // Consumo atômico: tenta encontrar e atualizar em uma única transação usando a premissa de que
    // o prisma ainda não suporta update atomic read em campos unique sem expor tentativas.
    // Usaremos uma query de update explícita que falha se as condições não baterem.

    // Primeiro, buscamos o token para validar
    const token = await prisma.telegramLinkToken.findUnique({
      where: { codeHash },
    });

    if (!token) {
      throw new AppError('Código inválido ou expirado', 400);
    }

    if (token.usedAt) {
      throw new AppError('Código inválido ou expirado', 400); // Mensagem genérica para segurança
    }

    if (token.expiresAt < now) {
      throw new AppError('Código inválido ou expirado', 400);
    }

    if (token.attempts >= token.maxAttempts) {
      throw new AppError('Código inválido ou expirado', 400);
    }

    // Incrementa tentativas atômicamente e marca como usado (se for usar o mesmo endpoint para consumo).
    // Aqui marcamos como usado imediatamente se as tentativas permitirem
    const updatedToken = await prisma.telegramLinkToken.updateMany({
      where: {
        id: token.id,
        usedAt: null,
        attempts: { lt: token.maxAttempts },
      },
      data: {
        usedAt: now,
        attempts: { increment: 1 }
      },
    });

    if (updatedToken.count === 0) {
      // Se não atualizou nada, é porque ou estourou limite simultaneamente ou foi usado
      // Incrementa tentativa falha atômicamente se puder (não podemos fazer aqui porque não sabemos o motivo exato se foi concorrente)
      // Como incrementamos attempts no sucesso tb, e só 1 sucesso ocorre, no erro a gnt incrementaria se tivessemos validado erro de PIN.
      // O pareamento por PIN exige verificar o PIN enviado pelo usuario em comparacao a todos os PINs do usuario?
      // Não, a PK natural/Unique constraint é o PIN (hash). Então quem erra o PIN, não acha o token.
      // E quem acerta o PIN mas esbarra no TTL/usedAt/maxAttempts cai nas validações acima.
      // A única race condition é multi-consumo do mesmo PIN válido.
      throw new AppError('Código inválido ou expirado', 400);
    }

    return {
      userId: token.userId,
      defaultWorkspaceId: token.defaultWorkspaceId ?? undefined,
      defaultAccountId: token.defaultAccountId ?? undefined,
      defaultExpenseCategoryId: token.defaultExpenseCategoryId ?? undefined,
      defaultIncomeCategoryId: token.defaultIncomeCategoryId ?? undefined,
    };
  }
}
