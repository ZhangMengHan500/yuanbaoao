import { PrismaService } from '../prisma/prisma.service';
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
    getUserById(id: string): Promise<{
        id: string;
        avatar: string | null;
        createdAt: Date;
        email: string;
        username: string;
    }>;
    updateUser(id: string, data: {
        username?: string;
        avatar?: string;
    }): Promise<{
        id: string;
        avatar: string | null;
        createdAt: Date;
        email: string;
        username: string;
    }>;
}
