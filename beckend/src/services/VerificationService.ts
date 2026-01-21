import { UserRepository } from '../repositories/UserRepository';
import { EtherealMailProvider } from '../providers/EtherealMailProvider';
import { IMailProvider } from '../providers/IMailProvider';

export class VerificationService {
  private userRepository: UserRepository;
  private mailProvider: IMailProvider;

  constructor() {
    this.userRepository = new UserRepository();
    this.mailProvider = new EtherealMailProvider();
  }

  // Envia o código de verificação (usado no registro e no reenvio)
  async sendVerificationCode(userId: number, email: string, name: string): Promise<void> { // MUDANÇA: number
    // Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Expira em 24 horas (tempo maior para ativação de conta)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.userRepository.createVerificationToken(userId, code, expiresAt);

    await this.mailProvider.sendMail(
      email,
      'Ative sua conta - Sistema G Financeiro',
      `
        <div style="font-family: sans-serif; font-size: 16px; color: #333;">
          <p>Olá, <strong>${name}</strong>!</p>
          <p>Obrigado por se cadastrar. Para ativar sua conta, use o código abaixo:</p>
          <h2 style="background: #e6fffa; color: #004d40; padding: 10px; display: inline-block; letter-spacing: 4px;">${code}</h2>
          <p>Este código é válido por 24 horas.</p>
        </div>
      `
    );
  }

  // Valida o código e ativa a conta
  async verifyAccount(email: string, code: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerifiedAt) {
      return; // Já verificado, retorna sucesso idempotente
    }

    const validToken = await this.userRepository.findValidVerificationToken(user.id, code);

    if (!validToken) {
      throw new Error('Invalid or expired token');
    }

    // Ativar usuário
    await this.userRepository.markEmailAsVerified(user.id);

    // Limpar token usado
    await this.userRepository.deleteVerificationToken(validToken.id);
  }

  // Reenvio de código
  async resendVerification(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      return; // Security through obscurity
    }

    if (user.emailVerifiedAt) {
      throw new Error('Account already verified');
    }

    await this.sendVerificationCode(user.id, user.email, user.name);
  }
}