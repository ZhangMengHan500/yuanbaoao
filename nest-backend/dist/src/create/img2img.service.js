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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var Img2ImgService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Img2ImgService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const prompt_service_1 = require("../llm/prompt.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ioredis_1 = __importDefault(require("ioredis"));
const uuid_1 = require("uuid");
const node_fetch_1 = __importDefault(require("node-fetch"));
const REDIS_KEY_PREFIX = 'img2img:progress:';
let Img2ImgService = Img2ImgService_1 = class Img2ImgService {
    constructor(prisma, promptService, imageGenProvider) {
        this.prisma = prisma;
        this.promptService = promptService;
        this.imageGenProvider = imageGenProvider;
        this.logger = new common_1.Logger(Img2ImgService_1.name);
        this.redis = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
            db: parseInt(process.env.REDIS_DB || '0'),
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        });
        this.redis.connect().catch((err) => {
            this.logger.error(`[Img2Img] Redis 连接失败: ${err.message}`);
        });
    }
    async submitJob(userId, params) {
        const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
        const jobId = (0, uuid_1.v4)();
        let imageBuffer = params.imageBuffer;
        if (!imageBuffer && params.imageUrl) {
            const imageUrl = params.imageUrl;
            if (imageUrl.startsWith('data:')) {
                const base64Data = imageUrl.split(',')[1];
                if (base64Data) {
                    imageBuffer = Buffer.from(base64Data, 'base64');
                }
            }
            else if (imageUrl.startsWith('/uploads/')) {
                const localPath = path.join(process.cwd(), imageUrl);
                if (fs.existsSync(localPath)) {
                    imageBuffer = fs.readFileSync(localPath);
                }
            }
            else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                const res = await (0, node_fetch_1.default)(imageUrl);
                if (!res.ok)
                    throw new Error(`Failed to download image: ${res.status}`);
                imageBuffer = Buffer.from(await res.arrayBuffer());
            }
        }
        if (!imageBuffer) {
            throw new Error('No image provided');
        }
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir))
            fs.mkdirSync(uploadDir, { recursive: true });
        const ext = path.extname(params.filename) || '.png';
        const refFilename = `${jobId}_ref${ext}`;
        const refPath = path.join(uploadDir, refFilename);
        fs.writeFileSync(refPath, imageBuffer);
        let finalPrompt = params.prompt;
        if (params.templateId) {
            const template = await this.prisma.aiStyleTemplate.findUnique({
                where: { id: params.templateId },
            });
            if (template) {
                finalPrompt = await this.promptService.composeImg2ImgPrompt(template.prompt, params.prompt || '用户上传的人像照片');
            }
        }
        await this.prisma.imageJob.create({
            data: {
                id: jobId,
                userId: effectiveUserId,
                templateId: params.templateId,
                jobType: 'img2img',
                status: 'processing',
                prompt: finalPrompt,
                negativePrompt: params.negativePrompt,
                referenceImageUrl: `/uploads/${refFilename}`,
                stylePrompt: params.templateId
                    ? (await this.prisma.aiStyleTemplate.findUnique({ where: { id: params.templateId } }))?.prompt
                    : undefined,
            },
        });
        await this.redis.set(`${REDIS_KEY_PREFIX}${jobId}`, JSON.stringify({ step: 0, totalSteps: 30, percent: 0, status: 'processing' }), 'EX', 3600);
        this.processJob(jobId, refPath, finalPrompt, params.negativePrompt);
        return { jobId, status: 'processing' };
    }
    async processJob(jobId, refImagePath, prompt, negativePrompt) {
        try {
            await this.updateRedisProgress(jobId, { step: 1, totalSteps: 30, percent: 3, status: 'processing' });
            const result = await this.imageGenProvider.generateImage(prompt, {
                negativePrompt,
                referenceImageUrl: refImagePath,
                width: 512,
                height: 512,
            });
            if (result.status === 'completed') {
                await this.prisma.imageJob.update({
                    where: { id: jobId },
                    data: { status: 'completed', resultImageUrl: result.imageUrl },
                });
                await this.updateRedisProgress(jobId, {
                    step: 30, totalSteps: 30, percent: 100,
                    status: 'completed', resultUrl: result.imageUrl,
                });
                this.logger.log(`Job ${jobId}: Completed`);
            }
            else {
                throw new Error(result.error || '生成失败');
            }
        }
        catch (error) {
            this.logger.error(`Job ${jobId}: Failed - ${error.message}`);
            await this.prisma.imageJob.update({
                where: { id: jobId },
                data: { status: 'failed', errorMsg: error.message },
            });
            await this.updateRedisProgress(jobId, {
                step: 0, totalSteps: 30, percent: 0,
                status: 'failed', error: error.message,
            });
        }
    }
    async updateRedisProgress(jobId, data) {
        await this.redis.set(`${REDIS_KEY_PREFIX}${jobId}`, JSON.stringify(data), 'EX', 3600);
    }
    async generatePrompt(templateId, referenceDescription) {
        const template = await this.prisma.aiStyleTemplate.findUnique({
            where: { id: templateId },
        });
        if (!template)
            throw new common_1.NotFoundException('模板不存在');
        const prompt = await this.promptService.composeImg2ImgPrompt(template.prompt, referenceDescription || '用户上传的人像照片');
        return {
            templateId,
            templateName: template.name,
            stylePrompt: template.prompt,
            generatedPrompt: prompt,
        };
    }
    async getProgress(jobId) {
        const data = await this.redis.get(`${REDIS_KEY_PREFIX}${jobId}`);
        if (!data)
            return null;
        return JSON.parse(data);
    }
    async getJobStatus(jobId, userId) {
        const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
        return this.prisma.imageJob.findFirst({
            where: { id: jobId, userId: effectiveUserId },
        });
    }
};
exports.Img2ImgService = Img2ImgService;
exports.Img2ImgService = Img2ImgService = Img2ImgService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)('IMAGE_GEN_PROVIDER')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        prompt_service_1.PromptService, Object])
], Img2ImgService);
//# sourceMappingURL=img2img.service.js.map