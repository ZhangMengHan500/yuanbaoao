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
exports.PostgresMemoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PostgresMemoryService = class PostgresMemoryService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getHistory(sessionId, maxMessages = 20) {
        const messages = await this.prisma.message.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'desc' },
            take: maxMessages,
            select: {
                role: true,
                content: true,
            },
        });
        return messages.reverse().map((m) => ({
            role: m.role,
            content: m.content,
        }));
    }
    async saveMessage(sessionId, message) {
        await this.prisma.message.create({
            data: {
                sessionId,
                role: message.role,
                content: message.content,
            },
        });
    }
    async clearHistory(sessionId) {
        await this.prisma.message.deleteMany({
            where: { sessionId },
        });
    }
    getMemoryType() {
        return 'postgres-memory';
    }
    async getHistoryByTimeRange(sessionId, from, to) {
        const messages = await this.prisma.message.findMany({
            where: {
                sessionId,
                createdAt: {
                    gte: from,
                    lte: to,
                },
            },
            orderBy: { createdAt: 'asc' },
            select: { role: true, content: true },
        });
        return messages.map((m) => ({
            role: m.role,
            content: m.content,
        }));
    }
    async searchHistory(sessionId, keyword) {
        const messages = await this.prisma.message.findMany({
            where: {
                sessionId,
                content: {
                    contains: keyword,
                    mode: 'insensitive',
                },
            },
            orderBy: { createdAt: 'asc' },
            select: { role: true, content: true },
        });
        return messages.map((m) => ({
            role: m.role,
            content: m.content,
        }));
    }
};
exports.PostgresMemoryService = PostgresMemoryService;
exports.PostgresMemoryService = PostgresMemoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PostgresMemoryService);
//# sourceMappingURL=postgres-memory.service.js.map