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
exports.CreateController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const create_service_1 = require("./create.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const class_validator_1 = require("class-validator");
const path_1 = require("path");
const uuid_1 = require("uuid");
class AiGenDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AiGenDto.prototype, "templateId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: '请输入图片描述' }),
    __metadata("design:type", String)
], AiGenDto.prototype, "userDescription", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AiGenDto.prototype, "aspectRatio", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AiGenDto.prototype, "negativePrompt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AiGenDto.prototype, "referenceImageUrl", void 0);
class AiEditDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: '请输入编辑指令' }),
    __metadata("design:type", String)
], AiEditDto.prototype, "editInstruction", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: '请上传参考图片' }),
    __metadata("design:type", String)
], AiEditDto.prototype, "referenceImageUrl", void 0);
class CosDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: '请选择角色' }),
    __metadata("design:type", String)
], CosDto.prototype, "characterName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: '请上传照片' }),
    __metadata("design:type", String)
], CosDto.prototype, "referenceImageUrl", void 0);
let CreateController = class CreateController {
    constructor(createService) {
        this.createService = createService;
    }
    getTemplates(category, page, pageSize) {
        return this.createService.getTemplates({
            category,
            page: page ? parseInt(page) : 1,
            pageSize: pageSize ? parseInt(pageSize) : 20,
        });
    }
    getTemplate(id) {
        return this.createService.getTemplate(id);
    }
    getStyleCategories() {
        return this.createService.getStyleCategories();
    }
    getStyleTemplates(categoryId) {
        return this.createService.getStyleTemplates(categoryId);
    }
    createAiGen(dto, userId) {
        return this.createService.createAiGenJob(userId, dto);
    }
    createAiEdit(dto, userId) {
        return this.createService.createEditJob(userId, dto);
    }
    createCos(dto, userId) {
        return this.createService.createCosJob(userId, dto);
    }
    getCosHeroes() {
        return this.createService.getCosHeroes();
    }
    seedCosHeroes() {
        return this.createService.seedCosHeroes();
    }
    getJobStatus(id, userId) {
        return this.createService.getJobStatus(id, userId);
    }
    getUserJobs(userId, page, pageSize) {
        return this.createService.getUserJobs(userId, {
            page: page ? parseInt(page) : 1,
            pageSize: pageSize ? parseInt(pageSize) : 20,
        });
    }
    uploadFile(file) {
        return { url: `/uploads/${file.filename}`, filename: file.filename };
    }
};
exports.CreateController = CreateController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('templates'),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], CreateController.prototype, "getTemplates", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('templates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CreateController.prototype, "getTemplate", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('style-categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CreateController.prototype, "getStyleCategories", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('style-templates'),
    __param(0, (0, common_1.Query)('categoryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CreateController.prototype, "getStyleTemplates", null);
__decorate([
    (0, common_1.Post)('ai-gen'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AiGenDto, String]),
    __metadata("design:returntype", void 0)
], CreateController.prototype, "createAiGen", null);
__decorate([
    (0, common_1.Post)('ai-edit'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AiEditDto, String]),
    __metadata("design:returntype", void 0)
], CreateController.prototype, "createAiEdit", null);
__decorate([
    (0, common_1.Post)('cos'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CosDto, String]),
    __metadata("design:returntype", void 0)
], CreateController.prototype, "createCos", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('cos/heroes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CreateController.prototype, "getCosHeroes", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('cos/seed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CreateController.prototype, "seedCosHeroes", null);
__decorate([
    (0, common_1.Get)('jobs/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CreateController.prototype, "getJobStatus", null);
__decorate([
    (0, common_1.Get)('jobs'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], CreateController.prototype, "getUserJobs", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads',
            filename: (_req, file, cb) => {
                cb(null, `${(0, uuid_1.v4)()}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
        limits: { fileSize: 20 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            if (!file.mimetype.match(/^image\/(jpeg|png|webp|gif)$/)) {
                cb(new Error('只支持 JPG/PNG/WEBP/GIF 格式'), false);
                return;
            }
            cb(null, true);
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CreateController.prototype, "uploadFile", null);
exports.CreateController = CreateController = __decorate([
    (0, common_1.Controller)('create'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, public_decorator_1.Public)(),
    __metadata("design:paramtypes", [create_service_1.CreateService])
], CreateController);
//# sourceMappingURL=create.controller.js.map