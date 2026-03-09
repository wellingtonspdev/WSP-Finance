import express, { Request, Response, NextFunction } from 'express';
import 'dotenv/config';
import cors from 'cors';
import { ZodError } from 'zod';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

import { router } from './routes';
import swaggerFile from './swagger-output.json'; // Arquivo autogerado 
import { CronService } from './services/CronService';

const app = express();

// Middlewares Globais
// CORREÇÃO CORS: Permitir credenciais e origem específica
app.use(cors({
  origin: 'http://localhost:5173', // URL do Frontend
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

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
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

  console.error(err);

  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
  return;
});

// Inicializar Cron Jobs
const cronService = new CronService();
cronService.start();

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📑 Swagger docs available at http://localhost:${PORT}/docs`);
});