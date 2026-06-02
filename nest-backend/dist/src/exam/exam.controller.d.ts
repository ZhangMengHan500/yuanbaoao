import { Response } from 'express';
import { ExamService } from './exam.service';
declare class GenerateSimilarDto {
    imageUrl: string;
    count?: number;
}
declare class GenerateReviewDto {
    imageUrl: string;
    weakPoints?: string[];
}
declare class GenerateCustomDto {
    subject?: string;
    grade?: string;
    questionTypes?: string;
    questionCount?: number;
    difficulty?: string;
    knowledgePoints?: string;
    description?: string;
}
export declare class ExamController {
    private examService;
    constructor(examService: ExamService);
    uploadExam(userId: string, file: Express.Multer.File): Promise<{
        url: string;
        filename: string;
        size: number;
    }>;
    generateSimilar(userId: string, dto: GenerateSimilarDto, res: Response): Promise<void>;
    generateReview(userId: string, dto: GenerateReviewDto, res: Response): Promise<void>;
    generateCustom(userId: string, dto: GenerateCustomDto, res: Response): Promise<void>;
}
export {};
