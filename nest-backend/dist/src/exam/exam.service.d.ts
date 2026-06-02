import { LlmService } from '../llm/llm.service';
export declare class ExamService {
    private llmService;
    private readonly logger;
    constructor(llmService: LlmService);
    parseExamImage(imagePath: string): Promise<ExamContent>;
    generateSimilarExam(content: ExamContent, count?: number): AsyncGenerator<string, void, unknown>;
    generateReviewExam(content: ExamContent, weakPoints: string[]): AsyncGenerator<string, void, unknown>;
    generateCustomExam(params: CustomExamParams): AsyncGenerator<string, void, unknown>;
}
interface ExamContent {
    title: string;
    subject: string;
    grade: string;
    questions: {
        index: number;
        type: string;
        content: string;
        options?: string[];
        knowledge?: string;
        difficulty?: string;
    }[];
}
interface CustomExamParams {
    subject?: string;
    grade?: string;
    questionTypes?: string;
    questionCount?: number;
    difficulty?: string;
    knowledgePoints?: string;
    description?: string;
}
export {};
