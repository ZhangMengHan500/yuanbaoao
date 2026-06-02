import { PersonaService } from './persona.service';
declare class CreatePersonaDto {
    name: string;
    description?: string;
    systemPrompt: string;
    avatar?: string;
    isDefault?: boolean;
}
declare class UpdatePersonaDto {
    name?: string;
    description?: string;
    systemPrompt?: string;
    avatar?: string;
    isDefault?: boolean;
}
export declare class PersonaController {
    private readonly personaService;
    constructor(personaService: PersonaService);
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
    getPersona(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        systemPrompt: string;
        avatar: string | null;
        isDefault: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createPersona(dto: CreatePersonaDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        systemPrompt: string;
        avatar: string | null;
        isDefault: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updatePersona(id: string, dto: UpdatePersonaDto): Promise<{
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
export {};
