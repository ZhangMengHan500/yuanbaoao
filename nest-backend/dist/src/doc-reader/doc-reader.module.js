"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocReaderModule = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const doc_reader_controller_1 = require("./controllers/doc-reader.controller");
const doc_service_1 = require("./services/doc.service");
const doc_chunker_service_1 = require("./services/doc-chunker.service");
const doc_embedding_service_1 = require("./services/doc-embedding.service");
const doc_qa_service_1 = require("./services/doc-qa.service");
const doc_summary_service_1 = require("./services/doc-summary.service");
const prisma_module_1 = require("../prisma/prisma.module");
const llm_module_1 = require("../llm/llm.module");
const MAX_FILE_SIZE = 50 * 1024 * 1024;
let DocReaderModule = class DocReaderModule {
};
exports.DocReaderModule = DocReaderModule;
exports.DocReaderModule = DocReaderModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            llm_module_1.LlmModule,
            platform_express_1.MulterModule.register({
                dest: './uploads/doc-reader',
                limits: {
                    fileSize: MAX_FILE_SIZE,
                },
            }),
        ],
        controllers: [doc_reader_controller_1.DocReaderController],
        providers: [
            doc_service_1.DocService,
            doc_chunker_service_1.DocChunkerService,
            doc_embedding_service_1.DocEmbeddingService,
            doc_qa_service_1.DocQAService,
            doc_summary_service_1.DocSummaryService,
        ],
        exports: [doc_service_1.DocService],
    })
], DocReaderModule);
//# sourceMappingURL=doc-reader.module.js.map