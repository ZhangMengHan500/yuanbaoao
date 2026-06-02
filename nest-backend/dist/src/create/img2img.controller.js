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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Img2ImgController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const img2img_service_1 = require("./img2img.service");
const rxjs_1 = require("rxjs");
let Img2ImgController = class Img2ImgController {
    constructor(img2imgService) {
        this.img2imgService = img2imgService;
    }
    async submitJob(req, file, userId) {
        const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
        const body = req.body || {};
        const prompt = body.prompt;
        const imageUrl = body.imageUrl;
        const negativePrompt = body.negativePrompt;
        const strength = body.strength;
        const templateId = body.templateId;
        console.log('[Img2Img] received:', {
            imageUrl,
            prompt: prompt?.substring(0, 40),
            hasFile: !!file,
            bodyKeys: Object.keys(body),
            templateId,
        });
        return this.img2imgService.submitJob(effectiveUserId, {
            imageBuffer: file?.buffer,
            imageUrl,
            filename: file?.originalname || 'reference.png',
            prompt,
            negativePrompt,
            strength: strength ? parseFloat(strength) : 0.75,
            templateId,
        });
    }
    async generatePrompt(templateId, referenceDescription) {
        return this.img2imgService.generatePrompt(templateId, referenceDescription);
    }
    getProgress(jobId) {
        return (0, rxjs_1.interval)(500).pipe((0, rxjs_1.switchMap)(async () => {
            const progress = await this.img2imgService.getProgress(jobId);
            return progress || { step: 0, totalSteps: 30, percent: 0, status: 'pending' };
        }), (0, rxjs_1.takeWhile)(progress => {
            const status = progress.status;
            return status === 'processing' || status === 'pending';
        }, true));
    }
    async getJobStatus(jobId, userId) {
        const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
        return this.img2imgService.getJobStatus(jobId, effectiveUserId);
    }
};
exports.Img2ImgController = Img2ImgController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', {
        limits: {
            fileSize: 10 * 1024 * 1024,
            fieldSize: 10 * 1024 * 1024,
        },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], Img2ImgController.prototype, "submitJob", null);
__decorate([
    (0, common_1.Post)('generate-prompt'),
    __param(0, (0, common_1.Body)('templateId')),
    __param(1, (0, common_1.Body)('referenceDescription')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], Img2ImgController.prototype, "generatePrompt", null);
__decorate([
    (0, common_1.Get)('progress/:jobId'),
    (0, common_1.Sse)(),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", rxjs_1.Observable)
], Img2ImgController.prototype, "getProgress", null);
__decorate([
    (0, common_1.Get)('job/:jobId'),
    __param(0, (0, common_1.Param)('jobId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], Img2ImgController.prototype, "getJobStatus", null);
exports.Img2ImgController = Img2ImgController = __decorate([
    (0, common_1.Controller)('create/img2img'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, public_decorator_1.Public)(),
    __metadata("design:paramtypes", [img2img_service_1.Img2ImgService])
], Img2ImgController);
//# sourceMappingURL=img2img.controller.js.map