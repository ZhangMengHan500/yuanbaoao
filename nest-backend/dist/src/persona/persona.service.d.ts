import { PrismaService } from '../prisma/prisma.service';
export declare class PersonaService {
    private prisma;
    constructor(prisma: PrismaService);
    getPersonas(): Promise<{
        id: string;
        name: string;
        description: string | null;
        systemPrompt: string;
        avatar: string | null;
        isDefault: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getPersonaById(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        systemPrompt: string;
        avatar: string | null;
        isDefault: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createPersona(data: {
        name: string;
        description?: string;
        systemPrompt: string;
        avatar?: string;
        isDefault?: boolean;
    }): Promise<{
        id: string;
        name: string;
        description: string | null;
        systemPrompt: string;
        avatar: string | null;
        isDefault: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updatePersona(id: string, data: {
        name?: string;
        description?: string;
        systemPrompt?: string;
        avatar?: string;
        isDefault?: boolean;
    }): Promise<{
        id: string;
        name: string;
        description: string | null;
        systemPrompt: string;
        avatar: string | null;
        isDefault: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deletePersona(id: string): Promise<{
        deleted: boolean;
    }>;
}
