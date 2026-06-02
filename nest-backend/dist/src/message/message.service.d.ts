import { PrismaService } from '../prisma/prisma.service';
export declare class MessageService {
    private prisma;
    constructor(prisma: PrismaService);
    getMessagesBySession(sessionId: string): Promise<{
        id: string;
        createdAt: Date;
        imageUrl: string | null;
        sessionId: string;
        role: string;
        content: string;
    }[]>;
    createMessage(sessionId: string, role: string, content: string, imageUrl?: string): Promise<{
        id: string;
        createdAt: Date;
        imageUrl: string | null;
        sessionId: string;
        role: string;
        content: string;
    }>;
    getRecentMessages(sessionId: string, limit?: number): Promise<{
        id: string;
        createdAt: Date;
        imageUrl: string | null;
        sessionId: string;
        role: string;
        content: string;
    }[]>;
}
