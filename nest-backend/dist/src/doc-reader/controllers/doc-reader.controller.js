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
exports.DocReaderController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const doc_service_1 = require("../services/doc.service");
const doc_qa_service_1 = require("../services/doc-qa.service");
const doc_summary_service_1 = require("../services/doc-summary.service");
const upload_doc_dto_1 = require("../dto/upload-doc.dto");
const qa_request_dto_1 = require("../dto/qa-request.dto");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const public_decorator_1 = require("../../common/decorators/public.decorator");
let DocReaderController = class DocReaderController {
    constructor(docService, qaService, summaryService) {
        this.docService = docService;
        this.qaService = qaService;
        this.summaryService = summaryService;
    }
    async uploadDocument(userId, file, dto) {
        return this.docService.uploadDocument(userId, file, dto.title);
    }
    async getDocuments(userId) {
        return this.docService.getDocuments(userId);
    }
    async getDocument(userId, id) {
        return this.docService.getDocumentById(id, userId);
    }
    async getDocumentStatus(userId, id) {
        return this.docService.getDocumentStatus(id, userId);
    }
    async getDocumentContent(userId, id, page = 1, pageSize = 20) {
        return this.docService.getDocumentContent(id, userId, page, pageSize);
    }
    async getDocumentSummary(userId, id) {
        await this.docService.getDocumentById(id, userId);
        return this.summaryService.getSummaries(id);
    }
    async deleteDocument(userId, id) {
        return this.docService.deleteDocument(id, userId);
    }
    async getChunk(id) {
        return this.docService.getChunkById(id);
    }
    async createConversation(userId, documentId) {
        return this.qaService.createConversation(documentId, userId);
    }
    async getConversations(userId, documentId) {
        return this.qaService.getConversations(documentId, userId);
    }
    async getMessages(id) {
        return this.qaService.getMessages(id);
    }
    async chat(userId, id, dto, res) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        try {
            for await (const event of this.qaService.streamChat(id, userId, dto.message)) {
                res.write(`data: ${JSON.stringify(event)}\n\n`);
            }
            res.end();
        }
        catch (error) {
            res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
            res.end();
        }
    }
};
exports.DocReaderController = DocReaderController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, upload_doc_dto_1.UploadDocDto]),
    __metadata("design:returntype", Promise)
], DocReaderController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Get)('documents'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DocReaderController.prototype, "getDocuments", null);
__decorate([
    (0, common_1.Get)('documents/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocReaderController.prototype, "getDocument", null);
__decorate([
    (0, common_1.Get)('documents/:id/status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocReaderController.prototype, "getDocumentStatus", null);
__decorate([
    (0, common_1.Get)('documents/:id/content'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], DocReaderController.prototype, "getDocumentContent", null);
__decorate([
    (0, common_1.Get)('documents/:id/summary'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocReaderController.prototype, "getDocumentSummary", null);
__decorate([
    (0, common_1.Delete)('documents/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocReaderController.prototype, "deleteDocument", null);
__decorate([
    (0, common_1.Get)('chunks/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DocReaderController.prototype, "getChunk", null);
__decorate([
    (0, common_1.Post)('conversations'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)('documentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocReaderController.prototype, "createConversation", null);
__decorate([
    (0, common_1.Get)('conversations'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)('documentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocReaderController.prototype, "getConversations", null);
__decorate([
    (0, common_1.Get)('conversations/:id/messages'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DocReaderController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)('conversations/:id/chat'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, qa_request_dto_1.QARequestDto, Object]),
    __metadata("design:returntype", Promise)
], DocReaderController.prototype, "chat", null);
exports.DocReaderController = DocReaderController = __decorate([
    (0, common_1.Controller)('doc-reader'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, public_decorator_1.Public)(),
    __metadata("design:paramtypes", [doc_service_1.DocService,
        doc_qa_service_1.DocQAService,
        doc_summary_service_1.DocSummaryService])
], DocReaderController);
//# sourceMappingURL=doc-reader.controller.js.map