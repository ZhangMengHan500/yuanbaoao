import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChromaClient, IEmbeddingFunction } from 'chromadb';

const SILICONFLOW_API = 'https://api.siliconflow.cn/v1/embeddings';
const EMBEDDING_MODEL = 'BAAI/bge-m3';

// 自定义 Embedding 函数：调用 SiliconFlow API
export class SiliconFlowEmbedding implements IEmbeddingFunction {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(documents: string[]): Promise<number[][]> {
    const response = await fetch(SILICONFLOW_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: documents,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Embedding API error: ${response.status} - ${err}`);
    }

    const result = await response.json() as any;
    // 按 index 排序，确保顺序正确
    return result.data
      .sort((a: any, b: any) => a.index - b.index)
      .map((item: any) => item.embedding);
  }
}

@Injectable()
export class RagService implements OnModuleInit {
  private chromaClient: ChromaClient;
  private collectionName = 'yuanbao_knowledge';
  private collection: any;
  private embeddingFn: SiliconFlowEmbedding;

  constructor(private configService: ConfigService) {
    const chromaUrl = this.configService.get<string>('CHROMA_URL') || 'http://localhost:8000';
    const apiKey = this.configService.get<string>('SILICONFLOW_API_KEY') || '';
    this.chromaClient = new ChromaClient({ path: chromaUrl });
    this.embeddingFn = new SiliconFlowEmbedding(apiKey);
  }

  async onModuleInit() {
    try {
      this.collection = await this.chromaClient.getOrCreateCollection({
        name: this.collectionName,
        embeddingFunction: this.embeddingFn,
      });
      const count = await this.collection.count();
      console.log(`ChromaDB 集合就绪: ${this.collectionName}, 文档数: ${count}`);
    } catch (error) {
      console.warn('ChromaDB 连接失败，RAG 功能将不可用:', error);
    }
  }

  async addDocument(docId: string, title: string, content: string) {
    try {
      console.log(`[RAG] addDocument called: docId=${docId}, title=${title}`);
      console.log(`[RAG] content length: ${content.length}, collection exists: ${!!this.collection}`);

      if (!this.collection) {
        console.log('[RAG] Collection not initialized, calling onModuleInit...');
        await this.onModuleInit();
      }
      if (!this.collection) {
        console.error('[RAG] Still no collection after onModuleInit, ChromaDB 未连接');
        return { added: 0, error: 'ChromaDB 未连接' };
      }

      const chunks = this.splitText(content, 500);
      console.log(`[RAG] Split into ${chunks.length} chunks`);

      const ids = chunks.map((_, i) => `${docId}_chunk_${i}`);
      const metadatas = chunks.map(() => ({ docId, title }));

      console.log('[RAG] Calling collection.upsert...');
      await this.collection.upsert({
        ids,
        documents: chunks,
        metadatas,
      });

      const count = await this.collection.count();
      console.log(`[RAG] 文档写入向量库成功: ${title}, ${chunks.length} 个分块, 总文档数: ${count}`);
      return { added: chunks.length };
    } catch (error) {
      console.error('[RAG] 添加文档到向量库失败:', error);
      return { added: 0, error: '添加失败' };
    }
  }

  async queryDocuments(query: string, topK: number = 3): Promise<string> {
    try {
      if (!this.collection) {
        await this.onModuleInit();
      }
      if (!this.collection) {
        return '';
      }

      const count = await this.collection.count();
      if (count === 0) {
        console.log('[RAG] 向量库为空，跳过检索');
        return '';
      }

      const results = await this.collection.query({
        queryTexts: [query],
        nResults: topK,
      });

      if (results.documents && results.documents[0]) {
        const docs = results.documents[0].filter(Boolean);
        if (docs.length > 0) {
          console.log(`[RAG] 检索到 ${docs.length} 条相关文档`);
          return docs.join('\n\n');
        }
      }

      return '';
    } catch (error) {
      console.error('查询向量库失败:', error);
      return '';
    }
  }

  async deleteDocument(docId: string) {
    try {
      if (!this.collection) {
        return { deleted: 0 };
      }

      const results = await this.collection.get({
        where: { docId },
      });

      if (results.ids.length > 0) {
        await this.collection.delete({ ids: results.ids });
        return { deleted: results.ids.length };
      }

      return { deleted: 0 };
    } catch (error) {
      console.error('从向量库删除文档失败:', error);
      return { deleted: 0, error: '删除失败' };
    }
  }

  private splitText(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\n+/);

    let currentChunk = '';
    for (const paragraph of paragraphs) {
      if ((currentChunk + '\n\n' + paragraph).length > chunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}
