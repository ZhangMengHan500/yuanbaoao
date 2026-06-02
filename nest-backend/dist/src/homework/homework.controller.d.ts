import { Response } from 'express';
import { HomeworkService } from './homework.service';
declare class GradeDto {
    imageUrl: string;
    text?: string;
}
export declare class HomeworkController {
    private readonly homeworkService;
    constructor(homeworkService: HomeworkService);
    grade(dto: GradeDto, res: Response): Promise<void>;
}
export {};
