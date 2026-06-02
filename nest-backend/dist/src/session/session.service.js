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
exports.SessionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SessionService = class SessionService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSessions(userId) {
        return this.prisma.session.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            include: {
                persona: true,
                _count: {
                    select: { messages: true },
                },
            },
        });
    }
    async createSession(userId, dto) {
        return this.prisma.session.create({
            data: {
                userId,
                title: dto.title || 'New Chat',
                personaId: dto.personaId,
            },
            include: {
                persona: true,
            },
        });
    }
    async getSessionById(sessionId, userId) {
        const session = await this.prisma.session.findFirst({
            where: { id: sessionId, userId },
            include: {
                persona: true,
                messages: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('会话不存在');
        }
        return session;
    }
    async updateSessionTitle(sessionId, userId, title) {
        const session = await this.prisma.session.findFirst({
            where: { id: sessionId, userId },
        });
        if (!session) {
            throw new common_1.NotFoundException('会话不存在');
        }
        return this.prisma.session.update({
            where: { id: sessionId },
            data: { title },
        });
    }
    async updateSessionPersona(sessionId, userId, personaId) {
        const session = await this.prisma.session.findFirst({
            where: { id: sessionId, userId },
        });
        if (!session) {
            throw new common_1.NotFoundException('会话不存在');
        }
        const persona = await this.prisma.persona.findUnique({
            where: { id: personaId },
        });
        if (!persona) {
            throw new common_1.NotFoundException('角色人设不存在');
        }
        return this.prisma.session.update({
            where: { id: sessionId },
            data: { personaId },
            include: { persona: true },
        });
    }
    async deleteSession(sessionId, userId) {
        const session = await this.prisma.session.findFirst({
            where: { id: sessionId, userId },
        });
        if (!session) {
            throw new common_1.NotFoundException('会话不存在');
        }
        await this.prisma.session.delete({
            where: { id: sessionId },
        });
        return { deleted: true };
    }
};
exports.SessionService = SessionService;
exports.SessionService = SessionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SessionService);
//# sourceMappingURL=session.service.js.map