import { SmartEditService } from './smart-edit.service';
import { Observable } from 'rxjs';
import { Request } from 'express';
export declare class SmartEditController {
    private readonly smartEditService;
    constructor(smartEditService: SmartEditService);
    submitJob(userId: string, req: Request, file?: Express.Multer.File): Promise<{
        jobId: string;
        status: string;
    }>;
    getProgress(jobId: string): Observable<any>;
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
