import { PrismaService } from '../prisma/prisma.service';
import { PromptService } from '../llm/prompt.service';
import { IImageGenProvider } from './image-gen.provider';
export declare class SmartEditService {
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
        tool: string;
        prompt?: string;
        ratio?: string;
    }): Promise<{
        jobId: string;
        status: string;
    }>;
    private getToolPrompt;
    private processJob;
    private updateRedisProgress;
    getProgress(jobId: string): Promise<any>;
    getJobStatus(jobId: string, userId: string): Promise<{
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
