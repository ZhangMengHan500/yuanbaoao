import { Img2ImgService } from './img2img.service';
import { Observable } from 'rxjs';
import { Request } from 'express';
export declare class Img2ImgController {
    private readonly img2imgService;
    constructor(img2imgService: Img2ImgService);
    submitJob(req: Request, file?: Express.Multer.File, userId?: string): Promise<{
        jobId: string;
        status: string;
    }>;
    generatePrompt(templateId: string, referenceDescription?: string): Promise<{
        templateId: string;
        templateName: string;
        stylePrompt: string;
        generatedPrompt: string;
    }>;
    getProgress(jobId: string): Observable<any>;
    getJobStatus(jobId: string, userId?: string): Promise<{
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
