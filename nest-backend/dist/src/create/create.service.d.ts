import { PrismaService } from '../prisma/prisma.service';
import { PromptService } from '../llm/prompt.service';
import { IImageGenProvider } from './image-gen.provider';
export declare class CreateService {
    private prisma;
    private promptService;
    private imageGenProvider;
    private readonly logger;
    constructor(prisma: PrismaService, promptService: PromptService, imageGenProvider: IImageGenProvider);
    getTemplates(params: {
        category?: string;
        page?: number;
        pageSize?: number;
    }): Promise<{
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
    createAiGenJob(userId: string | undefined, dto: {
        templateId?: string;
        userDescription: string;
        aspectRatio?: string;
        negativePrompt?: string;
        referenceImageUrl?: string;
    }): Promise<{
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
    createEditJob(userId: string | undefined, dto: {
        editInstruction: string;
        referenceImageUrl: string;
    }): Promise<{
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
    createCosJob(userId: string | undefined, dto: {
        characterName: string;
        referenceImageUrl: string;
    }): Promise<{
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
    getJobStatus(jobId: string, userId: string | undefined): Promise<{
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
    getUserJobs(userId: string | undefined, params: {
        page?: number;
        pageSize?: number;
    }): Promise<{
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
    private processImageJob;
    private getCharacterDescription;
}
