"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryFactory = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const buffer_memory_service_1 = require("./buffer-memory.service");
const redis_memory_service_1 = require("./redis-memory.service");
const postgres_memory_service_1 = require("./postgres-memory.service");
let MemoryFactory = class MemoryFactory {
    constructor(configService, bufferMemory, redisMemory, postgresMemory) {
        this.configService = configService;
        this.bufferMemory = bufferMemory;
        this.redisMemory = redisMemory;
        this.postgresMemory = postgresMemory;
        this.memoryService = null;
    }
    getMemoryService() {
        if (this.memoryService) {
            return this.memoryService;
        }
        const memoryType = this.configService.get('MEMORY_TYPE') || 'buffer';
        switch (memoryType.toLowerCase()) {
            case 'redis':
                this.memoryService = this.redisMemory;
                console.log('[MemoryFactory] 使用 Redis 缓存记忆');
                break;
            case 'postgres':
            case 'postgresql':
                this.memoryService = this.postgresMemory;
                console.log('[MemoryFactory] 使用 PostgreSQL 持久化记忆');
                break;
            case 'buffer':
            default:
                this.memoryService = this.bufferMemory;
                console.log('[MemoryFactory] 使用内存缓冲记忆（重启清空）');
                break;
        }
        return this.memoryService;
    }
    getMemoryTypeName() {
        return this.getMemoryService().getMemoryType();
    }
};
exports.MemoryFactory = MemoryFactory;
exports.MemoryFactory = MemoryFactory = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        buffer_memory_service_1.BufferMemoryService,
        redis_memory_service_1.RedisMemoryService,
        postgres_memory_service_1.PostgresMemoryService])
], MemoryFactory);
//# sourceMappingURL=memory.factory.js.map