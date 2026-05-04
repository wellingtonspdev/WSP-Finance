import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export const AdminMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user || !req.user.id) {
            res.status(401).json({ message: 'Autenticação necessária para acesso admin.' });
            return;
        }

        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { systemRole: true }
        });

        if (!user) {
            res.status(403).json({ message: 'Acesso negado: Usuário não encontrado ou privilégios insuficientes.' });
            return;
        }

        if (user.systemRole !== 'ADMIN') {
            console.warn(`[AdminMiddleware] Usuário ${userId} tentou acessar rota admin sem privilégios.`);
            res.status(403).json({ message: 'Acesso negado: Requer privilégios de administrador.' });
            return;
        }

        console.log(`[AdminMiddleware] Acesso admin concedido ao usuário ${userId}.`);
        next();
    } catch (error) {
        console.error('AdminMiddleware Error:', error);
        res.status(500).json({ message: 'Erro interno ao validar privilégios de administrador.' });
    }
};
