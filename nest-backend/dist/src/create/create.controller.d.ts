import { CreateService } from './create.service';
declare class AiGenDto {
    templateId?: string;
    userDescription: string;
    aspectRatio?: string;
    negativePrompt?: string;
    referenceImageUrl?: string;
}
declare class AiEditDto {
    editInstruction: string;
    referenceImageUrl: string;
}
declare class CosDto {
    characterName: string;
    referenceImageUrl: string;
}
export declare class CreateController {
    private readonly createService;
    constructor(createService: CreateService);
    getTemplates(category?: string, page?: string, pageSize?: string): Promise<{
        items: {
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            category: string;
            stylePrompt: string;
            previewUrl: string;
            hasOriginal: boolean;
            isActive: boolean;
            sortOrder: number;
        }[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
    }>;
    getTemplate(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        stylePrompt: string;
        previewUrl: string;
        hasOriginal: boolean;
        isActive: boolean;
        sortOrder: number;
    }>;
    getStyleCategories(): Promise<({
        templates: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            coverImg: string;
            prompt: string;
            categoryId: string;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        sort: number;
    })[]>;
    getStyleTemplates(categoryId?: string): Promise<({
        category: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            sort: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        coverImg: string;
        prompt: string;
        categoryId: string;
    })[]>;
    createAiGen(dto: AiGenDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        stylePrompt: string | null;
        prompt: string;
        userId: string;
        status: string;
        jobType: string;
        negativePrompt: string | null;
        referenceImageUrl: string | null;
        resultImageUrl: string | null;
        errorMsg: string | null;
        templateId: string | null;
    }>;
    createAiEdit(dto: AiEditDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        stylePrompt: string | null;
        prompt: string;
        userId: string;
        status: string;
        jobType: string;
        negativePrompt: string | null;
        referenceImageUrl: string | null;
        resultImageUrl: string | null;
        errorMsg: string | null;
        templateId: string | null;
    }>;
    createCos(dto: CosDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        stylePrompt: string | null;
        prompt: string;
        userId: string;
        status: string;
        jobType: string;
        negativePrompt: string | null;
        referenceImageUrl: string | null;
        resultImageUrl: string | null;
        errorMsg: string | null;
        templateId: string | null;
    }>;
    getCosHeroes(): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        sortOrder: number;
        desc: string;
        color: string;
        imageUrl: string | null;
        previewPrompt: string;
        cosPrompt: string;
    }[]>;
    seedCosHeroes(): Promise<{
        message: string;
        seeded: boolean;
        heroes?: undefined;
    } | {
        message: string;
        seeded: boolean;
        heroes: any[];
    }>;
    getJobStatus(id: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        stylePrompt: string | null;
        prompt: string;
        userId: string;
        status: string;
        jobType: string;
        negativePrompt: string | null;
        referenceImageUrl: string | null;
        resultImageUrl: string | null;
        errorMsg: string | null;
        templateId: string | null;
    }>;
    getUserJobs(userId: string, page?: string, pageSize?: string): Promise<{
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            stylePrompt: string | null;
            prompt: string;
            userId: string;
            status: string;
            jobType: string;
            negativePrompt: string | null;
            referenceImageUrl: string | null;
            resultImageUrl: string | null;
            errorMsg: string | null;
            templateId: string | null;
        }[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    uploadFile(file: Express.Multer.File): {
        url: string;
        filename: string;
    };
}
export {};
