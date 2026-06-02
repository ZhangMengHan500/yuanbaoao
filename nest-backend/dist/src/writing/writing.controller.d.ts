import { Response } from 'express';
import { WritingService } from './writing.service';
declare class WritingGenerateDto {
    writingType: string;
    filters: Record<string, string>;
    topic: string;
}
export declare class WritingController {
    private readonly writingService;
    constructor(writingService: WritingService);
    generate(dto: WritingGenerateDto, res: Response): Promise<void>;
}
export {};
