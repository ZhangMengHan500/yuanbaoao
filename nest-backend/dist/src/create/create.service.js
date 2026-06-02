"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CreateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const prompt_service_1 = require("../llm/prompt.service");
const hero_prompts_1 = require("./hero-prompts");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let CreateService = CreateService_1 = class CreateService {
    constructor(prisma, promptService, imageGenProvider) {
        this.prisma = prisma;
        this.promptService = promptService;
        this.imageGenProvider = imageGenProvider;
        this.logger = new common_1.Logger(CreateService_1.name);
    }
    async getTemplates(params) {
        const { category, page = 1, pageSize = 20 } = params;
        const where = {
            isActive: true,
            ...(category && category !== '推荐' ? { category } : {}),
        };
        const [items, total] = await Promise.all([
            this.prisma.template.findMany({
                where,
                orderBy: { sortOrder: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.template.count({ where }),
        ]);
        return { items, total, page, pageSize, hasMore: page * pageSize < total };
    }
    async getTemplate(id) {
        const template = await this.prisma.template.findUnique({ where: { id } });
        if (!template)
            throw new common_1.NotFoundException('模板不存在');
        return template;
    }
    async getStyleCategories() {
        return this.prisma.styleCategory.findMany({
            orderBy: { sort: 'desc' },
            include: {
                templates: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }
    async getStyleTemplates(categoryId) {
        const where = categoryId ? { categoryId } : {};
        return this.prisma.aiStyleTemplate.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { category: true },
        });
    }
    async createAiGenJob(userId, dto) {
        const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
        let stylePrompt = '';
        if (dto.templateId) {
            const template = await this.prisma.template.findUnique({
                where: { id: dto.templateId },
            });
            if (!template)
                throw new common_1.NotFoundException('模板不存在');
            stylePrompt = template.stylePrompt;
        }
        const finalPrompt = await this.promptService.composeAiGenPrompt(stylePrompt || 'high quality, detailed', dto.userDescription, dto.aspectRatio);
        const job = await this.prisma.imageJob.create({
            data: {
                userId: effectiveUserId,
                templateId: dto.templateId,
                jobType: 'ai_gen',
                status: 'processing',
                prompt: finalPrompt,
                negativePrompt: dto.negativePrompt,
                stylePrompt,
                referenceImageUrl: dto.referenceImageUrl,
            },
        });
        this.processImageJob(job.id, finalPrompt, dto.negativePrompt, dto.referenceImageUrl);
        return job;
    }
    async createEditJob(userId, dto) {
        const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
        const finalPrompt = await this.promptService.composeEditPrompt(dto.editInstruction);
        const job = await this.prisma.imageJob.create({
            data: {
                userId: effectiveUserId,
                jobType: 'ai_edit',
                status: 'processing',
                prompt: finalPrompt,
                referenceImageUrl: dto.referenceImageUrl,
            },
        });
        this.processImageJob(job.id, finalPrompt, undefined, dto.referenceImageUrl);
        return job;
    }
    async createCosJob(userId, dto) {
        const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
        const heroPrompt = (0, hero_prompts_1.getHeroPrompt)(dto.characterName);
        const hasRef = dto.referenceImageUrl && dto.referenceImageUrl.trim();
        const finalPrompt = hasRef ? heroPrompt.cosPrompt : heroPrompt.previewPrompt;
        const job = await this.prisma.imageJob.create({
            data: {
                userId: effectiveUserId,
                jobType: 'cos',
                status: 'processing',
                prompt: finalPrompt,
                referenceImageUrl: hasRef ? dto.referenceImageUrl : undefined,
            },
        });
        this.processImageJob(job.id, finalPrompt, undefined, hasRef ? dto.referenceImageUrl : undefined);
        return job;
    }
    async getCosHeroes() {
        return this.prisma.cosHero.findMany({
            orderBy: { sortOrder: 'asc' },
        });
    }
    async seedCosHeroes() {
        const count = await this.prisma.cosHero.count();
        if (count > 0) {
            return { message: '英雄数据已存在，跳过初始化', seeded: false };
        }
        const { HERO_PROMPTS } = await Promise.resolve().then(() => __importStar(require('./hero-prompts')));
        const heroes = [
            { name: '蚩妩', color: '#c026d3', desc: '九尾妖狐', sortOrder: 0 },
            { name: '大乔', color: '#3b82f6', desc: '沧海之曜', sortOrder: 1 },
            { name: '朵莉亚', color: '#06b6d4', desc: '人鱼之歌', sortOrder: 2 },
            { name: '李白', color: '#8b5cf6', desc: '青莲剑仙', sortOrder: 3 },
            { name: '貂蝉', color: '#ec4899', desc: '绝世舞姬', sortOrder: 4 },
            { name: '孙悟空', color: '#f59e0b', desc: '齐天大圣', sortOrder: 5 },
            { name: '韩信', color: '#ef4444', desc: '国士无双', sortOrder: 6 },
            { name: '赵云', color: '#10b981', desc: '龙胆银枪', sortOrder: 7 },
        ];
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir))
            fs.mkdirSync(uploadDir, { recursive: true });
        const fetch = (await Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
        const results = [];
        for (let i = 0; i < heroes.length; i++) {
            const hero = heroes[i];
            const heroPrompt = HERO_PROMPTS[hero.name];
            if (!heroPrompt)
                continue;
            if (i > 0) {
                await new Promise(r => setTimeout(r, 20000));
            }
            this.logger.log(`[COS Seed] Generating preview for ${hero.name}...`);
            let imageUrl = null;
            try {
                const result = await this.imageGenProvider.generateImage(heroPrompt.previewPrompt, {
                    width: 768,
                    height: 1024,
                    negativePrompt: 'low quality, blurry, deformed, ugly, bad anatomy, bad hands, missing fingers, extra digits, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, bad proportions, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck',
                });
                if (result.status === 'completed' && result.imageUrl) {
                    const safeName = hero.name.replace(/[^一-龥a-zA-Z0-9]/g, '_');
                    const filename = `cos_hero_${safeName}.png`;
                    const filepath = path.join(uploadDir, filename);
                    let buffer;
                    if (result.imageUrl.startsWith('http')) {
                        const res = await fetch(result.imageUrl);
                        buffer = Buffer.from(await res.arrayBuffer());
                    }
                    else {
                        buffer = fs.readFileSync(path.join(process.cwd(), result.imageUrl));
                    }
                    fs.writeFileSync(filepath, buffer);
                    imageUrl = `/uploads/${filename}`;
                }
            }
            catch (err) {
                this.logger.warn(`[COS Seed] Failed to generate ${hero.name}: ${err.message}`);
            }
            const created = await this.prisma.cosHero.create({
                data: {
                    name: hero.name,
                    color: hero.color,
                    desc: hero.desc,
                    imageUrl,
                    previewPrompt: heroPrompt.previewPrompt,
                    cosPrompt: heroPrompt.cosPrompt,
                    sortOrder: hero.sortOrder,
                },
            });
            results.push(created);
        }
        return { message: `初始化完成，共 ${results.length} 个英雄`, seeded: true, heroes: results };
    }
    async getJobStatus(jobId, userId) {
        const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
        const job = await this.prisma.imageJob.findFirst({
            where: { id: jobId, userId: effectiveUserId },
        });
        if (!job)
            throw new common_1.NotFoundException('任务不存在');
        return job;
    }
    async getUserJobs(userId, params) {
        const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
        const { page = 1, pageSize = 20 } = params;
        const [items, total] = await Promise.all([
            this.prisma.imageJob.findMany({
                where: { userId: effectiveUserId },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.imageJob.count({ where: { userId: effectiveUserId } }),
        ]);
        return { items, total, page, pageSize };
    }
    async processImageJob(jobId, prompt, negativePrompt, referenceImageUrl) {
        try {
            const result = await this.imageGenProvider.generateImage(prompt, {
                negativePrompt,
                referenceImageUrl,
            });
            await this.prisma.imageJob.update({
                where: { id: jobId },
                data: {
                    status: result.status,
                    resultImageUrl: result.imageUrl,
                    errorMsg: result.error,
                },
            });
        }
        catch (error) {
            await this.prisma.imageJob.update({
                where: { id: jobId },
                data: { status: 'failed', errorMsg: error.message || '图片生成失败' },
            });
        }
    }
    getCharacterDescription(name) {
        const map = {
            李白: 'Ancient Chinese poet swordsman, white robes, flowing hair, holding a wine cup and sword',
            貂蝉: 'Elegant dancer in flowing hanfu, cherry blossom petals, graceful pose',
            孙悟空: 'Monkey King with golden armor, phoenix feather cap, wielding Ruyi Jingu Bang',
            韩信: 'Military general with spear, silver armor, war hero pose, epic battlefield',
            赵云: 'Dragon warrior in white armor, long spear, heroic stance, wind flowing cape',
            妲己: 'Enchanting fox spirit, pink fox ears, seductive pose, magical aura',
        };
        return map[name] || `Chinese game character ${name}, epic fantasy style`;
    }
};
exports.CreateService = CreateService;
exports.CreateService = CreateService = CreateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)('IMAGE_GEN_PROVIDER')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        prompt_service_1.PromptService, Object])
], CreateService);
//# sourceMappingURL=create.service.js.map