import { VideoService } from './video.service';
declare class GenerateVideoDto {
    prompt: string;
    inputImageUrl?: string;
    resolution?: string;
    negativePrompt?: string;
}
export declare class VideoController {
    private readonly videoService;
    constructor(videoService: VideoService);
    generate(user: any, dto: GenerateVideoDto): Promise<{
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
    getJob(id: string): Promise<{
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
    getUserJobs(user: any, page?: string, pageSize?: string): Promise<{
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
}
export {};
