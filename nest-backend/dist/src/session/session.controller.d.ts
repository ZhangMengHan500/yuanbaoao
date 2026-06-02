import { SessionService } from './session.service';
export declare class CreateSessionDto {
    title?: string;
    personaId?: string;
}
export declare class UpdatePersonaDto {
    personaId: string;
}
export declare class SessionController {
    private readonly sessionService;
    constructor(sessionService: SessionService);
    getSessions(userId?: string): Promise<({
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
    getSession(id: string, userId?: string): Promise<{
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
    createSession(userId?: string, dto?: CreateSessionDto): Promise<{
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
    updateSessionPersona(id: string, dto: UpdatePersonaDto, userId?: string): Promise<{
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
    deleteSession(id: string, userId?: string): Promise<{
        deleted: boolean;
    }>;
}
