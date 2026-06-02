import { PrismaService } from '../prisma/prisma.service';
import { IMemoryService, MemoryMessage } from './memory.interface';
export declare class PostgresMemoryService implements IMemoryService {
    private prisma;
    constructor(prisma: PrismaService);
    getHistory(sessionId: string, maxMessages?: number): Promise<MemoryMessage[]>;
    saveMessage(sessionId: string, message: MemoryMessage): Promise<void>;
    clearHistory(sessionId: string): Promise<void>;
    getMemoryType(): string;
    getHistoryByTimeRange(sessionId: string, from: Date, to: Date): Promise<MemoryMessage[]>;
    searchHistory(sessionId: string, keyword: string): Promise<MemoryMessage[]>;
}
