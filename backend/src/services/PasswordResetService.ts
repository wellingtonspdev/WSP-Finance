import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { UserRepository } from '../repositories/UserRepository';
import { EtherealMailProvider } from '../providers/EtherealMailProvider';
import { IMailProvider } from '../providers/IMailProvider';

export class PasswordResetService {
  private userRepository: UserRepository;
  private mailProvider: IMailProvider;

  constructor() {
    this.userRepository = new UserRepository();
    // Em produção, injetaríamos isso via Dependency Injection
    this.mailProvider = new EtherealMailProvider();
  }

  // Passo 1: Solicitar o código
  async executeForgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    // Security through Obscurity: Se o e-mail não existe, não retornamos erro
    // para não revelar usuários cadastrados. Apenas retornamos sucesso silencioso.
    if (!user) {
      return;
    }

    // Gerar código numérico de 6 dígitos (Fácil para mobile)
    const code = crypto.randomInt(100000, 999999).toString();

    // Expira em 15 minutos
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.userRepository.createPasswordResetToken(user.id, code, expiresAt);

    // Enviar E-mail
    await this.mailProvider.sendMail(
      user.email,
      'Recuperação de Senha - Sistema G Financeiro',
      `
        <div style="font-family: sans-serif; font-size: 16px; color: #333;">
          <p>Olá, <strong>${user.name}</strong>!</p>
          <p>Recebemos uma solicitação para redefinir sua senha.</p>
          <p>Seu código de verificação é:</p>
          <h2 style="background: #eee; padding: 10px; display: inline-block; letter-spacing: 4px;">${code}</h2>
          <p>Este código expira em 15 minutos.</p>
          <p>Se não foi você, ignore este e-mail.</p>
        </div>
      `
    );
  }

  // Passo 2: Redefinir a senha
  async executeResetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new Error('Invalid credentials'); // Mensagem genérica por segurança
    }

    const validToken = await this.userRepository.findValidResetToken(user.id, code);

    if (!validToken) {
      throw new Error('Invalid or expired token');
    }

    // Hash da nova senha
    const passwordHash = await bcrypt.hash(newPassword, 8);

    // Atualizar senha
    await this.userRepository.updatePassword(user.id, passwordHash);

    // Invalidar o token usado
    await this.userRepository.markTokenAsUsed(validToken.id);
    
    // Opcional: Invalidar todas as sessões (Refresh Tokens) por segurança
    await this.userRepository.deleteRefreshTokensByUserId(user.id);
  }
}
