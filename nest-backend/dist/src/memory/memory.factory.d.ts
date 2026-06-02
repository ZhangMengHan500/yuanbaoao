import { ConfigService } from '@nestjs/config';
import { IMemoryService } from './memory.interface';
import { BufferMemoryService } from './buffer-memory.service';
import { RedisMemoryService } from './redis-memory.service';
import { PostgresMemoryService } from './postgres-memory.service';
export declare class MemoryFactory {
    private configService;
    private bufferMemory;
    private redisMemory;
    private postgresMemory;
    private memoryService;
    constructor(configService: ConfigService, bufferMemory: BufferMemoryService, redisMemory: RedisMemoryService, postgresMemory: PostgresMemoryService);
    getMemoryService(): IMemoryService;
    getMemoryTypeName(): string;
}
