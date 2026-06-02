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
var SmartEditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartEditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const prompt_service_1 = require("../llm/prompt.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ioredis_1 = __importDefault(require("ioredis"));
const uuid_1 = require("uuid");
const node_fetch_1 = __importDefault(require("node-fetch"));
const REDIS_KEY_PREFIX = 'smart-edit:progress:';
let SmartEditService = SmartEditService_1 = class SmartEditService {
    constructor(prisma, promptService, imageGenProvider) {
        this.prisma = prisma;
        this.promptService = promptService;
        this.imageGenProvider = imageGenProvider;
        this.logger = new common_1.Logger(SmartEditService_1.name);
        this.redis = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
            db: parseInt(process.env.REDIS_DB || '0'),
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        });
        this.redis.connect().catch((err) => {
            this.logger.error(`[SmartEdit] Redis 连接失败: ${err.message}`);
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
        let finalPrompt = params.prompt || '';
        if (params.tool && !finalPrompt) {
            finalPrompt = this.getToolPrompt(params.tool, params.ratio);
        }
        await this.prisma.imageJob.create({
            data: {
                id: jobId,
                userId: effectiveUserId,
                jobType: 'smart-edit',
                status: 'processing',
                prompt: finalPrompt,
                referenceImageUrl: `/uploads/${refFilename}`,
            },
        });
        await this.redis.set(`${REDIS_KEY_PREFIX}${jobId}`, JSON.stringify({ step: 0, totalSteps: 30, percent: 0, status: 'processing' }), 'EX', 3600);
        this.processJob(jobId, refPath, finalPrompt, params.tool);
        return { jobId, status: 'processing' };
    }
    getToolPrompt(tool, ratio) {
        const prompts = {
            enhance: '高清修复，提升图片清晰度和细节，Real-ESRGAN超分辨率处理',
            beauty: '人像美颜，优化肤质，磨皮美白，自然美颜效果',
            remove: '去除杂物，局部重绘，图像修复，智能填充',
            beautify: '图片美化，优化光影色彩，提升整体画面质感',
            expand: ratio
                ? `智能扩图，将图片扩展为${ratio}比例，外绘扩展画面边界，保持风格一致`
                : '智能扩图，外绘扩展画面边界，保持风格一致',
            style: '风格迁移，将图片转换为指定艺术风格',
            ratio: ratio
                ? `比例调整，将图片调整为${ratio}比例，智能裁剪调整画面比例`
                : '比例调整，智能裁剪调整画面比例',
        };
        return prompts[tool] || '智能P图处理';
    }
    async processJob(jobId, refImagePath, prompt, tool) {
        try {
            await this.updateRedisProgress(jobId, { step: 1, totalSteps: 30, percent: 3, status: 'processing' });
            const result = await this.imageGenProvider.generateImage(prompt, {
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
                this.logger.log(`SmartEdit Job ${jobId}: Completed`);
            }
            else {
                throw new Error(result.error || '处理失败');
            }
        }
        catch (error) {
            this.logger.error(`SmartEdit Job ${jobId}: Failed - ${error.message}`);
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
    async getProgress(jobId) {
        const data = await this.redis.get(`${REDIS_KEY_PREFIX}${jobId}`);
        if (!data)
            return null;
        return JSON.parse(data);
    }
    async getJobStatus(jobId, userId) {
        return this.prisma.imageJob.findFirst({
            where: { id: jobId, userId },
        });
    }
};
exports.SmartEditService = SmartEditService;
exports.SmartEditService = SmartEditService = SmartEditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)('IMAGE_GEN_PROVIDER')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        prompt_service_1.PromptService, Object])
], SmartEditService);
//# sourceMappingURL=smart-edit.service.js.map