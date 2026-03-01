import { Request, Response } from 'express';
import { ExternalDataService } from '../infra/external/ExternalDataService';
import { z } from 'zod';

export class ExternalDataController {

    async getCnpj(req: Request, res: Response) {
        const paramsSchema = z.object({
            cnpj: z.string().min(14, 'CNPJ deve ter 14 dígitos')
        });

        try {
            const { cnpj } = paramsSchema.parse(req.params);
            const data = await ExternalDataService.fetchCnpj(cnpj);
            return res.status(200).json(data);
        } catch (err: any) {
            console.error(err);
            return res.status(500).json({ message: err.message || 'Erro Interno ao buscar CNPJ' });
        }
    }

    async getCep(req: Request, res: Response) {
        const paramsSchema = z.object({
            cep: z.string().min(8, 'CEP deve ter 8 dígitos')
        });

        try {
            const { cep } = paramsSchema.parse(req.params);
            const data = await ExternalDataService.fetchCep(cep);
            return res.status(200).json(data);
        } catch (err: any) {
            console.error(err);
            return res.status(500).json({ message: err.message || 'Erro Interno ao buscar CEP' });
        }
    }
}
