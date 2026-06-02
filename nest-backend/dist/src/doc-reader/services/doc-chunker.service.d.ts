import { DocChunk } from '../interfaces/document.interface';
interface ChunkConfig {
    chunkSize: number;
    chunkOverlap: number;
    separators: string[];
}
export declare class DocChunkerService {
    splitIntoChunks(text: string, docId: string, config?: ChunkConfig): DocChunk[];
    private splitLongParagraph;
    private extractTitle;
    private addOverlap;
    countTokens(text: string): number;
}
export {};
