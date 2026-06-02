import { PrismaService } from '../../prisma/prisma.service';
import { LlmService } from '../../llm/llm.service';
import { DocChunk } from '../interfaces/document.interface';
export declare class DocSummaryService {
    private prisma;
    private llmService;
    constructor(prisma: PrismaService, llmService: LlmService);
    generateSummaries(docId: string, chunks: DocChunk[]): Promise<void>;
    private generateExecutiveSummary;
    private generateKeyPoints;
    private generateOutline;
    getSummaries(docId: string): Promise<Record<string, any>>;
}
