import { PrismaService } from '../prisma/prisma.service';
import { PromptService } from '../llm/prompt.service';
import { IImageGenProvider } from './image-gen.provider';
export declare class Img2ImgService {
    private prisma;
    private promptService;
    private imageGenProvider;
    private readonly logger;
    private redis;
    constructor(prisma: PrismaService, promptService: PromptService, imageGenProvider: IImageGenProvider);
    submitJob(userId: string | undefined, params: {
        imageBuffer?: Buffer;
        imageUrl?: string;
        filename: string;
        prompt: string;
        negativePrompt?: string;
        strength?: number;
        templateId?: string;
    }): Promise<{
        jobId: string;
        status: string;
    }>;
    private processJob;
    private updateRedisProgress;
    generatePrompt(templateId: string, referenceDescription?: string): Promise<{
        templateId: string;
        templateName: string;
        stylePrompt: string;
        generatedPrompt: string;
    }>;
    getProgress(jobId: string): Promise<any>;
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
    } | null>;
}
