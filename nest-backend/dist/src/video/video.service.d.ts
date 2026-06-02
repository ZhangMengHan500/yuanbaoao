import { PrismaService } from '../prisma/prisma.service';
import { SiliconFlowVideo } from './siliconflow-video';
export declare class VideoService {
    private readonly prisma;
    private readonly siliconFlowVideo;
    private readonly logger;
    private subscribers;
    private jobSubscribers;
    constructor(prisma: PrismaService, siliconFlowVideo: SiliconFlowVideo);
    createJob(userId: string, params: {
        prompt: string;
        inputImageUrl?: string;
        resolution?: string;
        negativePrompt?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        prompt: string;
        userId: string;
        status: string;
        model: string | null;
        jobType: string;
        negativePrompt: string | null;
        errorMsg: string | null;
        inputImageUrl: string | null;
        resultVideoUrl: string | null;
        resolution: string | null;
        externalTaskId: string | null;
    }>;
    private submitToSiliconFlow;
    private pollJobStatus;
    getJob(jobId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        prompt: string;
        userId: string;
        status: string;
        model: string | null;
        jobType: string;
        negativePrompt: string | null;
        errorMsg: string | null;
        inputImageUrl: string | null;
        resultVideoUrl: string | null;
        resolution: string | null;
        externalTaskId: string | null;
    } | null>;
    getUserJobs(userId: string, page?: number, pageSize?: number): Promise<{
        jobs: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            prompt: string;
            userId: string;
            status: string;
            model: string | null;
            jobType: string;
            negativePrompt: string | null;
            errorMsg: string | null;
            inputImageUrl: string | null;
            resultVideoUrl: string | null;
            resolution: string | null;
            externalTaskId: string | null;
        }[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    subscribe(clientId: string, jobId: string): void;
    unsubscribe(clientId: string): void;
    private notifySubscribers;
}
