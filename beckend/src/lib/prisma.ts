import { PrismaClient } from '@prisma/client';

// Instância global do Prisma
// Inicialização simplificada para evitar conflitos de configuração do Prisma 7
export const prisma = new PrismaClient();