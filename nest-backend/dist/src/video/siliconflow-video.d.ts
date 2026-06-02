export interface VideoSubmitResult {
    taskId: string;
}
export interface VideoStatusResult {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    videoUrl?: string;
    errorMsg?: string;
}
export declare class SiliconFlowVideo {
    private readonly logger;
    submitTask(params: {
        prompt: string;
        inputImageUrl?: string;
        resolution?: string;
    }): Promise<VideoSubmitResult>;
    checkStatus(taskId: string): Promise<VideoStatusResult>;
    downloadVideo(url: string): Promise<string>;
    private imageToBase64;
}
