import { TelegramContextResolver, isDestinationChoice } from './TelegramContextResolver';
import { TelegramLinkService } from './TelegramLinkService';
import { TelegramOcrIngestionService } from './TelegramOcrIngestionService';
import { TelegramOcrConfirmationService } from './TelegramOcrConfirmationService';
import crypto from 'crypto';

export interface ITelegramClient {
  sendMessage(chatId: string, text: string, options?: any): Promise<void>;
  editMessageText(text: string, options?: any): Promise<void>;
  on(event: string, listener: (msg: any) => void): void;
  startPolling?(): Promise<void>;
}

export class TelegramBotService {
  constructor(
    private client: ITelegramClient,
    private contextResolver: TelegramContextResolver,
    private linkService: TelegramLinkService,
    private ocrIngestionService: TelegramOcrIngestionService,
    private ocrConfirmationService: TelegramOcrConfirmationService
  ) {}

  startPolling() {
    if (process.env.TELEGRAM_BOT_ENABLED !== 'true') {
      console.log('Telegram bot is disabled.');
      return;
    }

    // In a real app, we would register listeners here
    this.client.on('message', this.handleMessage.bind(this));
    this.client.on('callback_query', this.handleCallbackQuery.bind(this));

    if (this.client.startPolling) {
      this.client.startPolling();
    }
  }

  private getCallbackSecret(): string {
    const secret = process.env.TELEGRAM_CALLBACK_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'test') {
        return 'test-callback-secret';
      }
      throw new Error('TELEGRAM_CALLBACK_SECRET is not configured');
    }
    return secret;
  }

  generateSignature(chatId: string, workspaceId: number, movementId: string, action: string): string {
    const secret = this.getCallbackSecret();
    const payload = `${chatId}:${workspaceId}:${movementId}:${action}`;
    return crypto.createHmac('sha256', secret).update(payload).digest('hex').substring(0, 16);
  }

  verifySignature(chatId: string, workspaceId: number, movementId: string, action: string, signature: string): boolean {
    const expected = this.generateSignature(chatId, workspaceId, movementId, action);
    return expected === signature;
  }

  async handleUpdate(update: any) {
    if (update.message) {
      await this.handleMessage(update.message);
    } else if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
    }
  }

  private async handleMessage(msg: any) {
    const chatId = msg.chat?.id?.toString();
    if (!chatId) return;

    if (msg.text) {
      const text = msg.text.trim();

      if (text.startsWith('/start')) {
        await this.client.sendMessage(chatId, 'Bem-vindo ao WSP Finance!\n\nPara iniciar o processo de vinculação, utilize o comando /vincular_conta ou digite /ajuda para ver os comandos disponíveis.');

        // Deep link silencioso (fora do fluxo principal)
        const parts = text.split(' ');
        if (parts.length > 1) {
          const code = parts[1];
          if (/^\d{6}$/.test(code)) {
            try {
              const telegramUsername = msg.chat?.username || msg.from?.username;
              const telegramUserId = msg.from?.id?.toString();
              const hasDestination = await this.linkService.consumeCode(code, chatId, telegramUserId, telegramUsername);
              if (hasDestination) {
                await this.client.sendMessage(chatId, 'Telegram conectado com sucesso ao WSP Finance!\n\nA partir de agora você pode enviar comprovantes fictícios como Documento/Arquivo em JPG ou PNG para teste acadêmico.\n\nNão envie dados reais.');
              } else {
                await this.client.sendMessage(chatId, 'Telegram conectado com sucesso ao WSP Finance!\n\nAgora você precisa configurar um destino (Pessoal ou Empresa) no aplicativo para começar a enviar comprovantes.');
              }
            } catch (err: any) {
              console.error('Telegram link error via deep link:', err.message);
              // Fail silently or log
            }
          }
        }
        return;
      }

      if (text === '/ajuda') {
        await this.client.sendMessage(chatId, 'Comandos disponíveis:\n\n/start - Boas-vindas\n/ajuda - Ajuda\n/vincular_conta (ou /vincular) - Vincular conta\n/status - Ver status da conta e destino atual\n/destinos - Listar contas vinculadas\n/usar_pessoal - Mudar destino para conta pessoal\n/usar_empresa - Mudar destino para conta empresa\n/cancelar - Cancelar operação atual');
        return;
      }

      if (text.startsWith('/vincular_conta') || text.startsWith('/vincular')) {
        const parts = text.split(' ');
        if (parts.length > 1) {
          const code = parts[1];
          if (/^\d{6}$/.test(code)) {
            try {
              const telegramUsername = msg.chat?.username || msg.from?.username;
              const telegramUserId = msg.from?.id?.toString();

              const hasDestination = await this.linkService.consumeCode(code, chatId, telegramUserId, telegramUsername);
              if (hasDestination) {
                await this.client.sendMessage(chatId, 'Telegram conectado com sucesso ao WSP Finance!\n\nA partir de agora você pode enviar comprovantes fictícios como Documento/Arquivo em JPG ou PNG para teste acadêmico.\n\nNão envie dados reais.');
              } else {
                await this.client.sendMessage(chatId, 'Telegram conectado com sucesso ao WSP Finance!\n\nAgora você precisa configurar um destino (Pessoal ou Empresa) no aplicativo para começar a enviar comprovantes.');
              }
            } catch (err: any) {
              console.error('Telegram link error:', err.message);
              await this.client.sendMessage(chatId, 'Não foi possível vincular a conta: ' + err.message);
            }
            return;
          }
        }

        await this.client.sendMessage(chatId, 'Por favor, envie o comando com o código numérico gerado no aplicativo.\nExemplo: /vincular_conta 123456');
        return;
      }

      if (text === '/status') {
        try {
          const { link, destinations } = await this.linkService.getStatusByChatId(chatId);

          if (!link) {
            await this.client.sendMessage(chatId, 'Conta não vinculada. Use /vincular_conta.');
            return;
          }

          if (destinations.length === 0) {
            await this.client.sendMessage(chatId, 'Você está vinculado, mas nenhum destino foi configurado. Configure empresa ou conta pessoal no aplicativo.');
            return;
          }

          const defaultDest = destinations.find(d => d.isDefault);
          if (!defaultDest) {
            await this.client.sendMessage(chatId, `Você está vinculado, mas não há um destino padrão definido.\nPossui ${destinations.length} destino(s). Use /destinos para ver.`);
          } else {
            await this.client.sendMessage(chatId, `Você está vinculado.\nDestino atual: ${defaultDest.label || 'Workspace ' + defaultDest.workspaceId}`);
          }
        } catch (err) {
          await this.client.sendMessage(chatId, 'Conta não vinculada. Use /vincular_conta.');
        }
        return;
      }

      if (text === '/destinos') {
        try {
          const { link, destinations } = await this.linkService.getStatusByChatId(chatId);

          if (!link) {
            await this.client.sendMessage(chatId, 'Conta não vinculada.');
            return;
          }

          if (destinations.length === 0) {
            await this.client.sendMessage(chatId, 'Você não possui destinos configurados.');
            return;
          }

          const defaultDest = destinations.find(d => d.isDefault);
          if (!defaultDest) {
            const labels = destinations.map(d => `- ${d.label || 'Workspace ' + d.workspaceId}`).join('\n');
            await this.client.sendMessage(chatId, `Destinos disponíveis:\n${labels}`);
          } else {
            await this.client.sendMessage(chatId, `Destino atual: ${defaultDest.label || 'Workspace ' + defaultDest.workspaceId}`);
          }
        } catch (err) {
          await this.client.sendMessage(chatId, 'Conta não vinculada.');
        }
        return;
      }

      if (text === '/cancelar') {
        try {
          const { link } = await this.linkService.getStatusByChatId(chatId);
          if (!link) {
            await this.client.sendMessage(chatId, 'Conta não vinculada.');
            return;
          }
          await this.client.sendMessage(chatId, 'Operação atual cancelada.');
        } catch (err) {
          await this.client.sendMessage(chatId, 'Conta não vinculada.');
        }
        return;
      }

      if (text === '/usar_pessoal' || text === '/usar_empresa') {
        const keyword = text === '/usar_pessoal' ? 'pessoal' : 'empresa';
        try {
          const label = await this.contextResolver.setDefaultDestinationByKeyword(chatId, keyword);
          await this.client.sendMessage(chatId, `Destino padrão alterado para: ${label}. Os próximos comprovantes irão para esta conta.`);
        } catch (err: any) {
          await this.client.sendMessage(chatId, err.message);
        }
        return;
      }

      // Check if it's a 6-digit code for manual input directly (fallback)
      if (/^\d{6}$/.test(text)) {
        try {
          const telegramUsername = msg.chat?.username || msg.from?.username;
          const telegramUserId = msg.from?.id?.toString();

          const hasDestination = await this.linkService.consumeCode(text, chatId, telegramUserId, telegramUsername);
          if (hasDestination) {
            await this.client.sendMessage(chatId, 'Telegram conectado com sucesso ao WSP Finance.\n\nA partir de agora você pode enviar comprovantes fictícios como Documento/Arquivo em JPG ou PNG para teste acadêmico.\n\nNão envie dados reais.');
          } else {
            await this.client.sendMessage(chatId, 'Telegram conectado com sucesso ao WSP Finance!\n\nAgora você precisa configurar um destino (Pessoal ou Empresa) no aplicativo para começar a enviar comprovantes.');
          }
        } catch (err: any) {
          console.error('Telegram link error:', err.message);
          await this.client.sendMessage(chatId, 'Não foi possível vincular a conta: ' + err.message);
        }
        return;
      }
    }

    if (msg.photo) {
      await this.client.sendMessage(chatId, 'Recebi uma foto comprimida.\n\nPara garantir melhor leitura do comprovante, envie como Documento/Arquivo em PDF, JPG ou PNG.\n\nNesta POC acadêmica só usamos comprovantes fictícios.\nNenhuma transação foi criada.');
      return;
    }

    if (msg.document) {
      try {
        const resolveResult = await this.contextResolver.resolve(chatId);

        // Múltiplos destinos sem padrão: bot pede escolha antes de processar
        if (isDestinationChoice(resolveResult)) {
          const keyboard = resolveResult.destinations.map((d) => ([
            {
              text: d.label ?? `Workspace ${d.workspaceId}`,
              callback_data: `dest:${d.id}:${msg.document.file_id}`,
            },
          ]));

          await this.client.sendMessage(
            chatId,
            'Para qual destino deseja lançar este comprovante?',
            { reply_markup: { inline_keyboard: keyboard } },
          );
          return;
        }

        const context = resolveResult;

        // Inicia o processo de OCR no backend
        const telegramUsername = msg.chat?.username || msg.from?.username;
        const telegramUserId = msg.from?.id?.toString();

        const movement = await this.ocrIngestionService.ingest({
          chatId,
          telegramUserId,
          telegramUsername,
          fileId: msg.document.file_id,
          fileName: msg.document.file_name,
          mimeType: msg.document.mime_type || 'application/pdf',
          fileSize: msg.document.file_size || 0,
          telegramUserLinkId: context.telegramUserLinkId,
          userId: context.userId,
          workspaceId: context.workspaceId,
          accountId: context.accountId,
          categoryId: context.defaultExpenseCategoryId || null
        });

        // Simulando o callback do OCR para aprovação (que já vem no mock)
        const sig = this.generateSignature(chatId, context.workspaceId, movement.id, 'c');
        const keyboard = [
          [
            { text: 'Confirmar', callback_data: `ocr:c:${movement.id}:${sig}` },
            { text: 'Ignorar', callback_data: `ocr:i:${movement.id}:${sig}` }
          ]
        ];

        await this.client.sendMessage(chatId, `Comprovante recebido. Deseja confirmar?`, {
          reply_markup: { inline_keyboard: keyboard }
        });
      } catch (err: any) {
        console.error('Telegram processing error:', err.message);
        await this.client.sendMessage(chatId, 'Erro ao processar comprovante: ' + err.message);
      }
    }
  }

  private async handleCallbackQuery(query: any) {
    const chatId = query.message?.chat?.id?.toString();
    const data = query.data; // e.g. "ocr:c:mov123:sig123"

    if (!chatId || !data) return;

    // Seleção de destino quando há múltiplos destinos sem padrão
    if (data.startsWith('dest:')) {
      const parts = data.split(':');
      // dest:<destinationId>:<fileId>
      if (parts.length !== 3) return;
      const [, destinationId, fileId] = parts;

      try {
        const resolveResult = await this.contextResolver.resolve(chatId);
        if (isDestinationChoice(resolveResult)) {
          const context = await this.contextResolver.resolveByDestinationId(
            destinationId,
            resolveResult.userId,
          );

          await this.client.sendMessage(chatId, 'Comprovante recebido. Nesta versão, a criação automática de transações está desativada. Nenhuma transação foi criada.');
        }
      } catch (err: any) {
        console.error('Telegram dest callback error:', err.message);
        await this.client.sendMessage(chatId, 'Erro ao processar destino selecionado. Tente novamente.');
      }
      return;
    }

    if (data.startsWith('ocr:')) {
      const parts = data.split(':');
      if (parts.length !== 4) return;
      const [, action, movementId, signature] = parts;

      try {
        const resolveResult = await this.contextResolver.resolve(chatId);
        // Em callback de OCR, o ideal é não exigir escolha de destino, pois o destino foi escolhido no momento do envio.
        // A assinatura garante a autoria.
        if (isDestinationChoice(resolveResult)) {
          await this.client.sendMessage(chatId, 'Múltiplos destinos ativos. Por favor, defina um destino padrão primeiro com /usar_pessoal ou /usar_empresa.');
          return;
        }

        const context = resolveResult;

        if (!this.verifySignature(chatId, context.workspaceId, movementId, action, signature)) {
          await this.client.sendMessage(chatId, 'Assinatura inválida. Ação não autorizada.');
          return;
        }

        if (action === 'c') {
          await this.ocrConfirmationService.confirm(context.userId, context.workspaceId, movementId, context.defaultExpenseCategoryId || null, context.defaultIncomeCategoryId || null);
          await this.client.editMessageText('Transação criada com sucesso!', {
            chat_id: chatId,
            message_id: query.message?.message_id
          });
        } else if (action === 'i') {
          await this.ocrConfirmationService.cancel(context.userId, context.workspaceId, movementId);
          await this.client.editMessageText('Comprovante ignorado.', {
            chat_id: chatId,
            message_id: query.message?.message_id
          });
        }
      } catch (err: any) {
        await this.client.sendMessage(chatId, 'Erro: ' + err.message);
      }
    }
  }
}
