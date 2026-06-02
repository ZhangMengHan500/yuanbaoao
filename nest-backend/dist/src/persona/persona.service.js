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
exports.PersonaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PersonaService = class PersonaService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPersonas() {
        return this.prisma.persona.findMany({
            orderBy: { isDefault: 'desc' },
        });
    }
    async getPersonaById(id) {
        const persona = await this.prisma.persona.findUnique({
            where: { id },
        });
        if (!persona) {
            throw new common_1.NotFoundException('角色人设不存在');
        }
        return persona;
    }
    async createPersona(data) {
        return this.prisma.persona.create({
            data,
        });
    }
    async updatePersona(id, data) {
        const persona = await this.prisma.persona.findUnique({
            where: { id },
        });
        if (!persona) {
            throw new common_1.NotFoundException('角色人设不存在');
        }
        return this.prisma.persona.update({
            where: { id },
            data,
        });
    }
    async deletePersona(id) {
        const persona = await this.prisma.persona.findUnique({
            where: { id },
        });
        if (!persona) {
            throw new common_1.NotFoundException('角色人设不存在');
        }
        await this.prisma.persona.delete({
            where: { id },
        });
        return { deleted: true };
    }
};
exports.PersonaService = PersonaService;
exports.PersonaService = PersonaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PersonaService);
//# sourceMappingURL=persona.service.js.map