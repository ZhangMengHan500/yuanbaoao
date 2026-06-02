import { ChromaClient } from 'chromadb';
import { config } from 'dotenv';
config();

const SILICONFLOW_API = 'https://api.siliconflow.cn/v1/embeddings';
const EMBEDDING_MODEL = 'BAAI/bge-m3';
const apiKey = process.env.SILICONFLOW_API_KEY || '';

class SiliconFlowEmbedding {
  constructor(apiKey) { this.apiKey = apiKey; }
  async generate(documents) {
    const response = await fetch(SILICONFLOW_API, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: documents }),
    });
    if (!response.ok) throw new Error(`Embedding API error: ${response.status}`);
    const result = await response.json();
    return result.data.sort((a, b) => a.index - b.index).map(item => item.embedding);
  }
}

async function main() {
  const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
  console.log('Connecting to ChromaDB at:', chromaUrl);
  console.log('API Key exists:', !!apiKey);

  const client = new ChromaClient({ path: chromaUrl });
  const embeddingFn = new SiliconFlowEmbedding(apiKey);

  const collection = await client.getOrCreateCollection({
    name: 'yuanbao_knowledge',
    embeddingFunction: embeddingFn,
  });

  const count = await collection.count();
  console.log('Current document count:', count);

  // Test adding a document
  const docId = `test_${Date.now()}`;
  const chunks = [
    'This is a test chunk about artificial intelligence.',
    'Machine learning is a subset of AI that enables systems to learn from data.',
    'Deep learning uses neural networks with multiple layers.',
  ];
  const ids = chunks.map((_, i) => `${docId}_chunk_${i}`);
  const metadatas = chunks.map(() => ({ docId, title: 'Test Document' }));

  console.log('Adding documents to ChromaDB...');
  await collection.upsert({ ids, documents: chunks, metadatas });

  const newCount = await collection.count();
  console.log('Document count after upsert:', newCount);

  // Test querying
  console.log('Querying for "AI"...');
  const results = await collection.query({ queryTexts: ['artificial intelligence'], nResults: 2 });
  console.log('Query results:', JSON.stringify(results.documents, null, 2));

  console.log('\n✅ RAG test passed!');
}

main().catch(err => {
  console.error('❌ RAG test failed:', err);
  process.exit(1);
});
