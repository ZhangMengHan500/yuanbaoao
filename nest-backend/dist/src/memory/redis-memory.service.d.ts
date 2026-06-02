import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMemoryService, MemoryMessage } from './memory.interface';
export declare class RedisMemoryService implements IMemoryService, OnModuleDestroy {
    private configService;
    private redis;
    private readonly keyPrefix;
    private readonly ttlSeconds;
    constructor(configService: ConfigService);
    onModuleDestroy(): Promise<void>;
    getHistory(sessionId: string, maxMessages?: number): Promise<MemoryMessage[]>;
    saveMessage(sessionId: string, message: MemoryMessage): Promise<void>;
    clearHistory(sessionId: string): Promise<void>;
    getMemoryType(): string;
    private getKey;
    getMessageCount(sessionId: string): Promise<number>;
}
