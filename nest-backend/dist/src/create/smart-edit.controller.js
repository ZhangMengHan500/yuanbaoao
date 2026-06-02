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
exports.SmartEditController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const smart_edit_service_1 = require("./smart-edit.service");
const rxjs_1 = require("rxjs");
let SmartEditController = class SmartEditController {
    constructor(smartEditService) {
        this.smartEditService = smartEditService;
    }
    async submitJob(userId, req, file) {
        const body = req.body || {};
        const tool = body.tool || 'enhance';
        const prompt = body.prompt;
        const imageUrl = body.imageUrl;
        const ratio = body.ratio;
        console.log('[SmartEdit] received:', {
            tool,
            imageUrl,
            prompt: prompt?.substring(0, 40),
            ratio,
            hasFile: !!file,
            bodyKeys: Object.keys(body),
        });
        return this.smartEditService.submitJob(userId, {
            imageBuffer: file?.buffer,
            imageUrl,
            filename: file?.originalname || 'reference.png',
            tool,
            prompt,
            ratio,
        });
    }
    getProgress(jobId) {
        return (0, rxjs_1.interval)(500).pipe((0, rxjs_1.switchMap)(async () => {
            const progress = await this.smartEditService.getProgress(jobId);
            return progress || { step: 0, totalSteps: 30, percent: 0, status: 'pending' };
        }), (0, rxjs_1.takeWhile)(progress => {
            const status = progress.status;
            return status === 'processing' || status === 'pending';
        }, true));
    }
    async getJobStatus(jobId, userId) {
        return this.smartEditService.getJobStatus(jobId, userId);
    }
};
exports.SmartEditController = SmartEditController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', {
        limits: {
            fileSize: 10 * 1024 * 1024,
            fieldSize: 10 * 1024 * 1024,
        },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SmartEditController.prototype, "submitJob", null);
__decorate([
    (0, common_1.Get)('progress/:jobId'),
    (0, common_1.Sse)(),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", rxjs_1.Observable)
], SmartEditController.prototype, "getProgress", null);
__decorate([
    (0, common_1.Get)('job/:jobId'),
    __param(0, (0, common_1.Param)('jobId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SmartEditController.prototype, "getJobStatus", null);
exports.SmartEditController = SmartEditController = __decorate([
    (0, common_1.Controller)('create/smart-edit'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, public_decorator_1.Public)(),
    __metadata("design:paramtypes", [smart_edit_service_1.SmartEditService])
], SmartEditController);
//# sourceMappingURL=smart-edit.controller.js.map