import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './session.controller';
export declare class SessionService {
    private prisma;
    constructor(prisma: PrismaService);
    getSessions(userId: string): Promise<({
        persona: {
            id: string;
            name: string;
            description: string | null;
            systemPrompt: string;
            avatar: string | null;
            isDefault: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        _count: {
            messages: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        personaId: string | null;
    })[]>;
    createSession(userId: string, dto: CreateSessionDto): Promise<{
        persona: {
            id: string;
            name: string;
            description: string | null;
            systemPrompt: string;
            avatar: string | null;
            isDefault: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        personaId: string | null;
    }>;
    getSessionById(sessionId: string, userId: string): Promise<{
        persona: {
            id: string;
            name: string;
            description: string | null;
            systemPrompt: string;
            avatar: string | null;
            isDefault: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        messages: {
            id: string;
            createdAt: Date;
            imageUrl: string | null;
            sessionId: string;
            role: string;
            content: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        personaId: string | null;
    }>;
    updateSessionTitle(sessionId: string, userId: string, title: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        personaId: string | null;
    }>;
    updateSessionPersona(sessionId: string, userId: string, personaId: string): Promise<{
        persona: {
            id: string;
            name: string;
            description: string | null;
            systemPrompt: string;
            avatar: string | null;
            isDefault: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        personaId: string | null;
    }>;
    deleteSession(sessionId: string, userId: string): Promise<{
        deleted: boolean;
    }>;
}
