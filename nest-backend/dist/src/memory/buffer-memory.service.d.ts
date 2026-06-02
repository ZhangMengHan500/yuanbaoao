import { IMemoryService, MemoryMessage } from './memory.interface';
export declare class BufferMemoryService implements IMemoryService {
    private store;
    getHistory(sessionId: string, maxMessages?: number): Promise<MemoryMessage[]>;
    saveMessage(sessionId: string, message: MemoryMessage): Promise<void>;
    clearHistory(sessionId: string): Promise<void>;
    getMemoryType(): string;
    getSessionCount(): number;
}
