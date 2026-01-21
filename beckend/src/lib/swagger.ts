import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Sistema G Financeiro',
      version: '1.0.0',
      description: 'API para gestão financeira híbrida (Pessoal e Empresarial).',
      contact: {
        name: 'Equipe de Desenvolvimento',
      },
    },
    servers: [
      {
        url: 'http://localhost:3333',
        description: 'Servidor de Desenvolvimento',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // --- Schemas de Sucesso ---
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1, description: 'ID sequencial do usuário' },
            name: { type: 'string', example: 'Wellington' },
            email: { type: 'string', format: 'email', example: 'wellington@example.com' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            token: { type: 'string', description: 'Token de Acesso JWT (15min)' },
            refreshToken: { type: 'string', format: 'uuid', description: 'Token opaco para renovação (30 dias)' },
          },
        },
        // --- Schemas de Erro Padronizados ---
        ApiError: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Mensagem descritiva do erro.' },
          },
          required: ['message'],
          example: { message: 'Credenciais inválidas' }
        },
        ValidationError: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'validation_error' },
            message: { type: 'string', example: 'Erro de validação nos dados enviados.' },
            issues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  path: { type: 'array', items: { type: 'string' } },
                }
              }
            }
          }
        }
      },
    },
  },
  apis: ['./src/routes.ts'], 
};

export const swaggerSpec = swaggerJsdoc(options);