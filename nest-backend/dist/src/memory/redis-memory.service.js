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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisMemoryService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
let RedisMemoryService = class RedisMemoryService {
    constructor(configService) {
        this.configService = configService;
        this.keyPrefix = 'chat:memory:';
        this.ttlSeconds = 86400;
        this.redis = new ioredis_1.default({
            host: this.configService.get('REDIS_HOST') || 'localhost',
            port: this.configService.get('REDIS_PORT') || 6379,
            password: this.configService.get('REDIS_PASSWORD') || undefined,
            db: this.configService.get('REDIS_DB') || 0,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        });
        this.redis.connect().catch((err) => {
            console.error('[RedisMemory] Redis 连接失败:', err.message);
        });
    }
    async onModuleDestroy() {
        await this.redis.quit();
    }
    async getHistory(sessionId, maxMessages = 20) {
        const key = this.getKey(sessionId);
        try {
            const rawList = await this.redis.lrange(key, 0, -1);
            if (rawList.length === 0) {
                return [];
            }
            const messages = rawList
                .map((raw) => {
                try {
                    return JSON.parse(raw);
                }
                catch {
                    return null;
                }
            })
                .filter((m) => m !== null);
            return messages.slice(-maxMessages);
        }
        catch (err) {
            console.error('[RedisMemory] 读取历史失败:', err);
            return [];
        }
    }
    async saveMessage(sessionId, message) {
        const key = this.getKey(sessionId);
        try {
            const serialized = JSON.stringify(message);
            await this.redis.rpush(key, serialized);
            await this.redis.expire(key, this.ttlSeconds);
        }
        catch (err) {
            console.error('[RedisMemory] 保存消息失败:', err);
        }
    }
    async clearHistory(sessionId) {
        const key = this.getKey(sessionId);
        try {
            await this.redis.del(key);
        }
        catch (err) {
            console.error('[RedisMemory] 清空历史失败:', err);
        }
    }
    getMemoryType() {
        return 'redis-memory';
    }
    getKey(sessionId) {
        return `${this.keyPrefix}${sessionId}`;
    }
    async getMessageCount(sessionId) {
        const key = this.getKey(sessionId);
        return this.redis.llen(key);
    }
};
exports.RedisMemoryService = RedisMemoryService;
exports.RedisMemoryService = RedisMemoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisMemoryService);
//# sourceMappingURL=redis-memory.service.js.map