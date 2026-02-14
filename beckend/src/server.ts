import express, { Request, Response, NextFunction } from 'express';
import 'dotenv/config';
import cors from 'cors';
import { ZodError } from 'zod';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

import { router } from './routes';
import { swaggerSpec } from './lib/swagger';
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
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rotas da Aplicação
app.use(router);

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      status: 'validation_error',
      message: 'Erro de validação nos dados enviados.',
      issues: err.format(),
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