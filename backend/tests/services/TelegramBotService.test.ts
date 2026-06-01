import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelegramBotService, ITelegramClient } from '../../src/services/TelegramBotService';

let mockClient: any;
let mockContextResolver: any;
let mockIngestionService: any;
let mockConfirmationService: any;
let mockLinkService: any;

describe('TelegramBotService', () => {
  let service: TelegramBotService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      sendMessage: vi.fn(),
      editMessageText: vi.fn(),
      on: vi.fn(),
      startPolling: vi.fn(),
    };

    mockContextResolver = {
      resolve: vi.fn(),
    };

    mockIngestionService = {
      ingest: vi.fn(),
    };

    mockConfirmationService = {
      confirm: vi.fn(),
      cancel: vi.fn(),
    };

    mockLinkService = {
      consumeCode: vi.fn(),
    };

    process.env.TELEGRAM_CALLBACK_SECRET = 'test-secret';
    process.env.TELEGRAM_BOT_ENABLED = 'true';
    process.env.OCR_PROVIDER = 'fake';
    service = new TelegramBotService(
      mockClient,
      mockContextResolver,
      mockLinkService,
      mockIngestionService,
      mockConfirmationService
    );
  });

  it('does not start polling if TELEGRAM_BOT_ENABLED is not true', () => {
    process.env.TELEGRAM_BOT_ENABLED = 'false';
    service.startPolling();
    expect(mockClient.startPolling).not.toHaveBeenCalled();
    expect(mockClient.on).not.toHaveBeenCalled();
  });

  it('starts polling if TELEGRAM_BOT_ENABLED is true', () => {
    service.startPolling();
    expect(mockClient.on).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockClient.on).toHaveBeenCalledWith('callback_query', expect.any(Function));
    expect(mockClient.startPolling).toHaveBeenCalled();
  });

  it('responds with academic warning to bare /start', async () => {
    await service.handleUpdate({ message: { text: '/start', chat: { id: 123 } } });
    expect(mockClient.sendMessage).toHaveBeenCalledWith(
      '123',
      expect.stringContaining('Bem-vindo ao WSP Finance')
    );
  });

  it('consumes token on /start <token>', async () => {
    await service.handleUpdate({
      message: {
        text: '/start 123456',
        chat: { id: 123, username: 'testuser' },
        from: { id: 456, username: 'testuser' }
      }
    });

    expect(mockLinkService.consumeCode).toHaveBeenCalledWith('123456', '123', '456', 'testuser');
    expect(mockClient.sendMessage).toHaveBeenCalledWith(
      '123',
      expect.stringContaining('Telegram conectado com sucesso ao WSP Finance')
    );
  });

  it('handles error when token consumption fails', async () => {
    mockLinkService.consumeCode.mockRejectedValueOnce(new Error('Invalid token'));

    await service.handleUpdate({
      message: {
        text: '/vincular_conta 123456',
        chat: { id: 123 }
      }
    });

    expect(mockClient.sendMessage).toHaveBeenCalledWith(
      '123',
      expect.stringContaining('Não foi possível vincular a conta: Invalid token')
    );
  });

  it('rejects photo payload', async () => {
    await service.handleUpdate({ message: { photo: [{}], chat: { id: 123 } } });
    expect(mockClient.sendMessage).toHaveBeenCalledWith(
      '123',
      expect.stringContaining('Recebi uma foto comprimida')
    );
    expect(mockIngestionService.ingest).not.toHaveBeenCalled();
  });

  it('processes document payload successfully', async () => {
    mockContextResolver.resolve.mockResolvedValue({
      workspaceId: 1, accountId: 10, userId: 5, defaultExpenseCategoryId: 20, telegramUserLinkId: 'link123'
    });
    mockIngestionService.ingest.mockResolvedValue({
      id: 'mov-123', amount: 150, date: new Date(), description: 'Test'
    });

    await service.handleUpdate({
      message: {
        document: { file_id: 'file-1', mime_type: 'application/pdf', file_size: 100 },
        chat: { id: '123' },
        from: { id: 456, username: 'testuser' }
      }
    });

    expect(mockContextResolver.resolve).toHaveBeenCalledWith('123');
    expect(mockIngestionService.ingest).toHaveBeenCalledWith({
      chatId: '123',
      telegramUserId: '456',
      telegramUsername: 'testuser',
      fileId: 'file-1',
      fileName: undefined,
      mimeType: 'application/pdf',
      fileSize: 100,
      telegramUserLinkId: 'link123',
      userId: 5,
      workspaceId: 1,
      accountId: 10,
      categoryId: 20
    });

    expect(mockClient.sendMessage).toHaveBeenCalledWith(
      '123',
      expect.stringContaining('Deseja confirmar'),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.any(Array)
        })
      })
    );
  });

  it('prompts user when destination requires choice', async () => {
    mockContextResolver.resolve.mockResolvedValue({
      requiresChoice: true,
      userId: 5,
      telegramUserLinkId: 'link-123',
      destinations: [
        { id: 'dest-1', label: 'Work', workspaceId: 1, accountId: 10 },
        { id: 'dest-2', label: 'Personal', workspaceId: 2, accountId: 20 },
      ]
    });

    await service.handleUpdate({
      message: {
        document: { file_id: 'file-1', mime_type: 'application/pdf', file_size: 100 },
        chat: { id: '123' }
      }
    });

    expect(mockClient.sendMessage).toHaveBeenCalledWith(
      '123',
      'Para qual destino deseja lançar este comprovante?',
      expect.objectContaining({
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Work', callback_data: 'dest:dest-1:file-1' }],
            [{ text: 'Personal', callback_data: 'dest:dest-2:file-1' }]
          ]
        }
      })
    );
  });

  it('processes valid confirm callback query', async () => {
    mockContextResolver.resolve.mockResolvedValue({
      workspaceId: 1, accountId: 10, userId: 5, defaultExpenseCategoryId: 20, defaultIncomeCategoryId: 30
    });
    mockConfirmationService.confirm.mockResolvedValue({ id: 'tx-123' });

    const sig = service.generateSignature('123', 1, 'mov-123', 'c');

    await service.handleUpdate({
      callback_query: {
        data: `ocr:c:mov-123:${sig}`,
        message: { chat: { id: '123' }, message_id: 999 }
      }
    });

    expect(mockConfirmationService.confirm).toHaveBeenCalledWith(5, 1, 'mov-123', 20, 30);
    expect(mockClient.editMessageText).toHaveBeenCalledWith(
      'Transação criada com sucesso!',
      expect.objectContaining({ chat_id: '123', message_id: 999 })
    );
  });

  describe('Command: /status', () => {
    it('returns not linked when link is null', async () => {
      mockLinkService.getStatusByChatId = vi.fn().mockResolvedValue({ link: null, destinations: [] });
      await service.handleUpdate({ message: { text: '/status', chat: { id: '123' } } });
      expect(mockClient.sendMessage).toHaveBeenCalledWith('123', 'Conta não vinculada. Use /vincular_conta.');
    });

    it('returns linked but no destination configured', async () => {
      mockLinkService.getStatusByChatId = vi.fn().mockResolvedValue({
        link: { id: '1', status: 'ACTIVE' },
        destinations: []
      });
      await service.handleUpdate({ message: { text: '/status', chat: { id: '123' } } });
      expect(mockClient.sendMessage).toHaveBeenCalledWith('123', 'Você está vinculado, mas nenhum destino foi configurado. Configure empresa ou conta pessoal no aplicativo.');
    });

    it('returns multiple destinations without default', async () => {
      mockLinkService.getStatusByChatId = vi.fn().mockResolvedValue({
        link: { id: '1', status: 'ACTIVE' },
        destinations: [{ id: 'd1', isDefault: false }, { id: 'd2', isDefault: false }]
      });
      await service.handleUpdate({ message: { text: '/status', chat: { id: '123' } } });
      expect(mockClient.sendMessage).toHaveBeenCalledWith('123', 'Você está vinculado, mas não há um destino padrão definido.\nPossui 2 destino(s). Use /destinos para ver.');
    });

    it('returns linked and current destination', async () => {
      mockLinkService.getStatusByChatId = vi.fn().mockResolvedValue({
        link: { id: '1', status: 'ACTIVE' },
        destinations: [{ id: 'd1', label: 'Pessoal', isDefault: true }]
      });
      await service.handleUpdate({ message: { text: '/status', chat: { id: '123' } } });
      expect(mockClient.sendMessage).toHaveBeenCalledWith('123', 'Você está vinculado.\nDestino atual: Pessoal');
    });
  });

  describe('Command: /cancelar', () => {
    it('cancels current operation if linked', async () => {
      mockLinkService.getStatusByChatId = vi.fn().mockResolvedValue({
        link: { id: '1', status: 'ACTIVE' },
        destinations: []
      });
      await service.handleUpdate({ message: { text: '/cancelar', chat: { id: '123' } } });
      expect(mockClient.sendMessage).toHaveBeenCalledWith('123', 'Operação atual cancelada.');
    });

    it('returns not linked if no link exists', async () => {
      mockLinkService.getStatusByChatId = vi.fn().mockResolvedValue({ link: null, destinations: [] });
      await service.handleUpdate({ message: { text: '/cancelar', chat: { id: '123' } } });
      expect(mockClient.sendMessage).toHaveBeenCalledWith('123', 'Conta não vinculada.');
    });
  });
});
