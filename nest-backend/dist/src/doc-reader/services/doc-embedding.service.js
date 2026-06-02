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
exports.DocEmbeddingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const chromadb_1 = require("chromadb");
const rag_service_1 = require("../../llm/rag.service");
let DocEmbeddingService = class DocEmbeddingService {
    constructor(configService) {
        this.configService = configService;
        this.collectionPrefix = 'doc_reader_';
        const chromaUrl = this.configService.get('CHROMA_URL') || 'http://localhost:8000';
        const apiKey = this.configService.get('SILICONFLOW_API_KEY') || '';
        this.chromaClient = new chromadb_1.ChromaClient({ path: chromaUrl });
        this.embeddingFn = new rag_service_1.SiliconFlowEmbedding(apiKey);
    }
    async onModuleInit() {
        console.log('[DocEmbedding] ChromaDB 连接就绪');
    }
    getCollectionName(docId) {
        return `${this.collectionPrefix}${docId}`;
    }
    async storeChunks(docId, chunks) {
        const collectionName = this.getCollectionName(docId);
        const collection = await this.chromaClient.getOrCreateCollection({
            name: collectionName,
            embeddingFunction: this.embeddingFn,
        });
        const ids = chunks.map((_, i) => `${docId}_chunk_${i}`);
        const documents = chunks.map(c => c.content);
        const metadatas = chunks.map(c => ({
            docId: c.metadata.docId,
            page: c.metadata.page,
            paragraph: c.metadata.paragraph,
            title: c.metadata.title,
            startOffset: c.metadata.startOffset,
            endOffset: c.metadata.endOffset,
        }));
        await collection.upsert({
            ids,
            documents,
            metadatas,
        });
        console.log(`[DocEmbedding] 存储 ${chunks.length} 个分块到 ${collectionName}`);
        return ids;
    }
    async queryChunks(docId, query, topK = 10) {
        const collectionName = this.getCollectionName(docId);
        try {
            const collection = await this.chromaClient.getCollection({
                name: collectionName,
                embeddingFunction: this.embeddingFn,
            });
            const results = await collection.query({
                queryTexts: [query],
                nResults: topK,
            });
            if (!results.documents?.[0] || !results.metadatas?.[0]) {
                return [];
            }
            return results.documents[0]
                .map((doc, i) => ({
                content: doc || '',
                metadata: results.metadatas[0][i],
                score: results.distances?.[0]?.[i] || 0,
            }))
                .filter(item => item.content);
        }
        catch (error) {
            console.error(`[DocEmbedding] 查询失败: ${error.message}`);
            return [];
        }
    }
    async deleteDocument(docId) {
        const collectionName = this.getCollectionName(docId);
        try {
            await this.chromaClient.deleteCollection({ name: collectionName });
            console.log(`[DocEmbedding] 删除集合 ${collectionName}`);
        }
        catch (error) {
            console.error(`[DocEmbedding] 删除失败: ${error.message}`);
        }
    }
};
exports.DocEmbeddingService = DocEmbeddingService;
exports.DocEmbeddingService = DocEmbeddingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DocEmbeddingService);
//# sourceMappingURL=doc-embedding.service.js.map