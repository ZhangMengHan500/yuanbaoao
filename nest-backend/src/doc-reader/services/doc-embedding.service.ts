import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChromaClient } from 'chromadb';
import { SiliconFlowEmbedding } from '../../llm/rag.service';
import { DocChunk, ChunkMetadata } from '../interfaces/document.interface';

@Injectable()
export class DocEmbeddingService implements OnModuleInit {
  private chromaClient: ChromaClient;
  private embeddingFn: SiliconFlowEmbedding;
  private collectionPrefix = 'doc_reader_';

  constructor(private configService: ConfigService) {
    const chromaUrl = this.configService.get<string>('CHROMA_URL') || 'http://localhost:8000';
    const apiKey = this.configService.get<string>('SILICONFLOW_API_KEY') || '';
    this.chromaClient = new ChromaClient({ path: chromaUrl });
    this.embeddingFn = new SiliconFlowEmbedding(apiKey);
  }

  async onModuleInit() {
    console.log('[DocEmbedding] ChromaDB 连接就绪');
  }

  private getCollectionName(docId: string): string {
    return `${this.collectionPrefix}${docId}`;
  }

  async storeChunks(docId: string, chunks: DocChunk[]): Promise<string[]> {
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

  async queryChunks(
    docId: string,
    query: string,
    topK: number = 10,
  ): Promise<{ content: string; metadata: ChunkMetadata; score: number }[]> {
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
          metadata: results.metadatas![0][i] as unknown as ChunkMetadata,
          score: results.distances?.[0]?.[i] || 0,
        }))
        .filter(item => item.content);
    } catch (error) {
      console.error(`[DocEmbedding] 查询失败: ${error.message}`);
      return [];
    }
  }

  async deleteDocument(docId: string): Promise<void> {
    const collectionName = this.getCollectionName(docId);

    try {
      await this.chromaClient.deleteCollection({ name: collectionName });
      console.log(`[DocEmbedding] 删除集合 ${collectionName}`);
    } catch (error) {
      console.error(`[DocEmbedding] 删除失败: ${error.message}`);
    }
  }
}
