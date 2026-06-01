import express, { Request, Response, NextFunction } from 'express';
import 'express-async-errors';
import 'dotenv/config';
import cors from 'cors';
import { ZodError } from 'zod';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

import { router } from './routes';
import swaggerFile from './swagger-output.json'; // Arquivo autogerado 
import { CronService } from './services/CronService';
import { Prisma } from '@prisma/client';
import { AuditLogService } from './services/AuditLogService';

const app = express();
export { app };

// Middlewares Globais
// CORREÇÃO CORS: Permitir credenciais e origem específica baseada no ambiente
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL || '']
  : ['http://localhost:5173', 'http://127.0.0.1:4173', 'http://localhost:4173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true, // Permite Cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-workspace-id']
}));

app.use(express.json());

// Servir arquivos estáticos (Uploads)
app.use('/files', express.static(path.resolve(__dirname, '..', 'uploads')));

// Documentação Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

// Rotas da Aplicação
app.use(router);

import { AppError } from './errors/AppError';

// Global Error Handler
// Handler exportado para permitir Testes Unitários Isolados
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }
  if (err instanceof ZodError) {
    // Traduz os campos do Zod para mensagens legíveis em PT-BR
    const fieldLabels: Record<string, string> = {
      description: 'Descrição',
      amount: 'Valor',
      date: 'Data',
      type: 'Tipo',
      accountId: 'Conta Bancária',
      categoryId: 'Categoria',
      isPaid: 'Status de Pagamento',
      grossAmount: 'Valor Bruto',
      marketplaceFee: 'Taxa de Marketplace',
      shippingCost: 'Custo de Frete',
      productCost: 'Custo do Produto',
      platformFeeRate: 'Taxa da Plataforma',
    };

    const friendlyErrors = err.issues.map(issue => {
      const field = issue.path.join('.');
      const label = fieldLabels[field] || field;
      return `${label}: ${issue.message}`;
    });

    res.status(400).json({
      status: 'validation_error',
      message: friendlyErrors.join(' | '),
      issues: err.issues,  // Array flat para parsing programático
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaErr = err as Prisma.PrismaClientKnownRequestError;
    // P2004: A constraint failed on the database
    // P2010: Raw query failed (sometimes thrown when RLS blocks bypass)
    if (prismaErr.code === 'P2004' || prismaErr.code === 'P2010') {
      const isRlsViolation = prismaErr.message.toLowerCase().includes('row-level security') || 
                             prismaErr.message.toLowerCase().includes('policy') ||
                             (prismaErr.meta && JSON.stringify(prismaErr.meta).toLowerCase().includes('row-level security'));

      if (isRlsViolation) {
        const customReq = req as any;
        const userId = customReq.user?.id;
        const workspaceId = customReq.headers['x-workspace-id'] ? Number(customReq.headers['x-workspace-id']) : undefined;

        if (userId) {
          AuditLogService.logAsync({
            userId,
            workspaceId: workspaceId || 0,
            action: 'DELETE', // Default mapped action per instructions, though it could be UPDATE/SELECT based on context
            entity: 'RLS_VIOLATION',
            entityId: 'SECURITY_BLOCK',
            ipAddress: customReq.ip,
            userAgent: customReq.headers['user-agent'],
            newState: { url: customReq.originalUrl, method: customReq.method }
          }).catch(console.error);
        }

        res.status(403).json({
          status: 'access_denied',
          message: 'Workspace isolation violated',
          ...(process.env.NODE_ENV === 'development' && { errorDetails: prismaErr.message, meta: prismaErr.meta })
        });
        return;
      } else {
        // P2004 FK/Constraint regular
        res.status(400).json({
          status: 'bad_request',
          message: 'Database constraint violation',
          ...(process.env.NODE_ENV === 'development' && { errorDetails: prismaErr.message, meta: prismaErr.meta })
        });
        return;
      }
    }
  }

  console.error(err);

  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
  return;
};

app.use(errorHandler);

import { prisma } from './lib/prisma';
import { checkPrivileges } from './lib/checkEnvironment';

const startServer = async () => {
  try {
    // 🛡️ Fail-Fast / Runtime Security Check
    // Lança um erro se o Prisma conectar com BypassRLS ou Superuser
    await checkPrivileges(prisma as any);

    // Inicializar Cron Jobs (Apenas após o banco estar saudável e verificado)
    const cronService = new CronService();
    cronService.start();

    // Inicializar Telegram Bot (Se ativado)
    if (process.env.TELEGRAM_BOT_ENABLED === 'true' && process.env.TELEGRAM_BOT_TOKEN) {
      try {
        // Necessário rodar: npm install node-telegram-bot-api
        const TelegramBot = require('node-telegram-bot-api');
        const botClient = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

        const { TelegramBotService } = require('./services/TelegramBotService');
        const { TelegramContextResolver } = require('./services/TelegramContextResolver');
        const { TelegramLinkService } = require('./services/TelegramLinkService');
        const { TelegramLinkTokenService } = require('./services/TelegramLinkTokenService');

        const telegramLinkTokenService = new TelegramLinkTokenService();
        const telegramLinkService = new TelegramLinkService(telegramLinkTokenService);
        const contextResolver = new TelegramContextResolver();

        const telegramBotService = new TelegramBotService(
          botClient,
          contextResolver,
          telegramLinkService
        );

        telegramBotService.startPolling();
        console.log('🤖 Telegram Bot Service initialized via polling.');
      } catch (botErr: any) {
        console.error('🚨 Failed to start Telegram Bot:', botErr.message || botErr);
      }
    }

    const PORT = process.env.PORT || 3333;

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📑 Swagger docs available at http://localhost:${PORT}/docs`);
    });

  } catch (err: any) {
    console.error('🚨 [RISCO SEVERO] Falha no RLS/DbConfig no Startup:', err.message || err);
    console.error('🛑 Ação: Para a arquitetura de Tenancy do WSP Finance, o runtime não deve conter [BYPASSRLS] nem [SUPERUSER].');
    process.exit(1);
  }
};
if (process.env.NODE_ENV !== 'test') {
  void startServer();
}
