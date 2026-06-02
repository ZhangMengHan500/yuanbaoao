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
exports.MessageService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MessageService = class MessageService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMessagesBySession(sessionId) {
        return this.prisma.message.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async createMessage(sessionId, role, content, imageUrl) {
        return this.prisma.message.create({
            data: {
                sessionId,
                role,
                content,
                ...(imageUrl ? { imageUrl } : {}),
            },
        });
    }
    async getRecentMessages(sessionId, limit = 20) {
        return this.prisma.message.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
            take: limit,
        });
    }
};
exports.MessageService = MessageService;
exports.MessageService = MessageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MessageService);
//# sourceMappingURL=message.service.js.map