export interface ChunkMetadata {
  docId: string;
  page: number;
  paragraph: number;
  title: string;
  startOffset: number;
  endOffset: number;
}

export interface DocChunk {
  content: string;
  metadata: ChunkMetadata;
}

export interface Citation {
  index: number;
  chunkId: string;
  page: number;
  text: string;
  startOffset: number;
  endOffset: number;
}

export interface SummaryResult {
  executive: string;
  keyPoints: string[];
  outline: string;
}
