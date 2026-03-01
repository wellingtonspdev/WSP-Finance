import { UserRepository } from '../repositories/UserRepository';
import { prisma } from '../lib/prisma';

interface UpdateProfileDTO {
    userId: number;
    cpf?: string;
    phone?: string;
    address?: {
        zipCode?: string;
        street?: string;
        number?: string;
        complement?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
    };
}

export class UserService {
    private userRepository: UserRepository;

    constructor() {
        this.userRepository = new UserRepository();
    }

    async updateProfile(data: UpdateProfileDTO) {
        const user = await this.userRepository.findById(data.userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Usando prisma direto aqui para atualização parcial, já que Repository 
        // precisará de refatoração para suportar todos os campos aninhados.
        const updatedUser = await prisma.user.update({
            where: { id: data.userId },
            data: {
                cpf: data.cpf,
                phone: data.phone,
                ...(data.address && { // Espalha o endereço se ele vier
                    zipCode: data.address.zipCode,
                    street: data.address.street,
                    number: data.address.number,
                    complement: data.address.complement,
                    neighborhood: data.address.neighborhood,
                    city: data.address.city,
                    state: data.address.state,
                })
            },
            select: {
                id: true,
                name: true,
                email: true,
                cpf: true,
                phone: true,
                zipCode: true,
                street: true,
                number: true,
                complement: true,
                neighborhood: true,
                city: true,
                state: true
            }
        });

        return updatedUser;
    }
}
