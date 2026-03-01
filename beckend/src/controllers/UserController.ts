import { Request, Response } from 'express';
import { z } from 'zod';
import { UserService } from '../services/UserService';

export class UserController {
    private userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    async updateProfile(req: Request, res: Response) {
        const updateProfileSchema = z.object({
            cpf: z.string().optional(),
            phone: z.string().optional(),
            address: z.object({
                zipCode: z.string().optional(),
                street: z.string().optional(),
                number: z.string().optional(),
                complement: z.string().optional(),
                neighborhood: z.string().optional(),
                city: z.string().optional(),
                state: z.string().optional(),
            }).optional()
        });

        try {
            const data = updateProfileSchema.parse(req.body);
            const userId = req.user.id; // From AuthMiddleware

            const updatedUser = await this.userService.updateProfile({
                userId,
                ...data
            });

            return res.status(200).json(updatedUser);
        } catch (err: any) {
            console.error('Update Profile Error:', err);
            return res.status(400).json({ message: err.message || 'Erro Interno ao atualizar perfil' });
        }
    }
}
