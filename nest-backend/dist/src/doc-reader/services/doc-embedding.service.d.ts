import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocChunk, ChunkMetadata } from '../interfaces/document.interface';
export declare class DocEmbeddingService implements OnModuleInit {
    private configService;
    private chromaClient;
    private embeddingFn;
    private collectionPrefix;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    private getCollectionName;
    storeChunks(docId: string, chunks: DocChunk[]): Promise<string[]>;
    queryChunks(docId: string, query: string, topK?: number): Promise<{
        content: string;
        metadata: ChunkMetadata;
        score: number;
    }[]>;
    deleteDocument(docId: string): Promise<void>;
}
