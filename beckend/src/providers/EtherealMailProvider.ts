import nodemailer, { Transporter } from 'nodemailer';
import { IMailProvider } from './IMailProvider';

export class EtherealMailProvider implements IMailProvider {
  private client: Transporter | null = null;

  constructor() {
    // O construtor não pode ser assíncrono, então inicializamos a promessa aqui
    // mas a verificação real ocorre no método sendMail
    nodemailer.createTestAccount().then((account) => {
      const transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
          user: account.user,
          pass: account.pass,
        },
      });

      this.client = transporter;
    }).catch(err => {
      console.error('Failed to create Ethereal account', err);
    });
  }

  async sendMail(to: string, subject: string, body: string): Promise<void> {
    // Garantir que o cliente foi inicializado (pode haver um delay na criação da conta de teste)
    if (!this.client) {
      // Em um cenário real, usaríamos uma fila ou retry, mas para dev, esperamos um pouco
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!this.client) {
        throw new Error('Mail provider not ready');
      }
    }

    const message = await this.client.sendMail({
      from: 'Equipe Financeiro <noreply@financeiro.com.br>',
      to,
      subject,
      html: body,
    });

    console.log('Message sent: %s', message.messageId);
    // URL para visualizar o e-mail no navegador (Feature exclusiva do Ethereal)
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(message));
  }
}