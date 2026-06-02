import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmbeddingFunction } from 'chromadb';
export declare class SiliconFlowEmbedding implements IEmbeddingFunction {
    private apiKey;
    constructor(apiKey: string);
    generate(documents: string[]): Promise<number[][]>;
}
export declare class RagService implements OnModuleInit {
    private configService;
    private chromaClient;
    private collectionName;
    private collection;
    private embeddingFn;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    addDocument(docId: string, title: string, content: string): Promise<{
        added: number;
        error: string;
    } | {
        added: number;
        error?: undefined;
    }>;
    queryDocuments(query: string, topK?: number): Promise<string>;
    deleteDocument(docId: string): Promise<{
        deleted: any;
        error?: undefined;
    } | {
        deleted: number;
        error: string;
    }>;
    private splitText;
}
