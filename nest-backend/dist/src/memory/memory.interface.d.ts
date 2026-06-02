export interface MemoryMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
export interface IMemoryService {
    getHistory(sessionId: string, maxMessages?: number): Promise<MemoryMessage[]>;
    saveMessage(sessionId: string, message: MemoryMessage): Promise<void>;
    clearHistory(sessionId: string): Promise<void>;
    getMemoryType(): string;
}
