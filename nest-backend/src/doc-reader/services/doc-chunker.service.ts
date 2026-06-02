import { Injectable } from '@nestjs/common';
import { DocChunk } from '../interfaces/document.interface';

interface ChunkConfig {
  chunkSize: number;
  chunkOverlap: number;
  separators: string[];
}

const DEFAULT_CONFIG: ChunkConfig = {
  chunkSize: 512,
  chunkOverlap: 128,
  separators: ['\n\n', '\n', '。', '；', '，', ' '],
};

@Injectable()
export class DocChunkerService {
  splitIntoChunks(
    text: string,
    docId: string,
    config: ChunkConfig = DEFAULT_CONFIG,
  ): DocChunk[] {
    const chunks: DocChunk[] = [];
    let currentOffset = 0;
    let paragraphNum = 0;
    let pageNumber = 1;

    const paragraphs = text.split(/\n\n+/);

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        currentOffset += paragraph.length + 2;
        continue;
      }

      paragraphNum++;

      const pageMatch = paragraph.match(/^第\s*(\d+)\s*页/);
      if (pageMatch) {
        pageNumber = parseInt(pageMatch[1], 10);
      }

      if (paragraph.length > config.chunkSize) {
        const subChunks = this.splitLongParagraph(
          paragraph,
          docId,
          pageNumber,
          paragraphNum,
          currentOffset,
          config,
        );
        chunks.push(...subChunks);
      } else {
        const lastChunk = chunks[chunks.length - 1];
        if (
          lastChunk &&
          lastChunk.content.length + paragraph.length + 2 <= config.chunkSize
        ) {
          lastChunk.content += '\n\n' + paragraph;
          lastChunk.metadata.endOffset = currentOffset + paragraph.length;
        } else {
          chunks.push({
            content: paragraph,
            metadata: {
              docId,
              page: pageNumber,
              paragraph: paragraphNum,
              title: this.extractTitle(paragraph),
              startOffset: currentOffset,
              endOffset: currentOffset + paragraph.length,
            },
          });
        }
      }

      currentOffset += paragraph.length + 2;
    }

    return this.addOverlap(chunks, config.chunkOverlap);
  }

  private splitLongParagraph(
    text: string,
    docId: string,
    page: number,
    paragraph: number,
    startOffset: number,
    config: ChunkConfig,
  ): DocChunk[] {
    const chunks: DocChunk[] = [];
    let remaining = text;
    let offset = startOffset;

    while (remaining.length > 0) {
      let splitIndex = -1;

      for (const sep of config.separators) {
        const lastSepIndex = remaining.lastIndexOf(sep, config.chunkSize);
        if (lastSepIndex > config.chunkSize * 0.3) {
          splitIndex = lastSepIndex + sep.length;
          break;
        }
      }

      if (splitIndex === -1) {
        splitIndex = config.chunkSize;
      }

      const chunkContent = remaining.substring(0, splitIndex).trim();
      if (chunkContent) {
        chunks.push({
          content: chunkContent,
          metadata: {
            docId,
            page,
            paragraph,
            title: this.extractTitle(chunkContent),
            startOffset: offset,
            endOffset: offset + splitIndex,
          },
        });
      }

      remaining = remaining.substring(splitIndex);
      offset += splitIndex;
    }

    return chunks;
  }

  private extractTitle(text: string): string {
    const firstLine = text.split('\n')[0].trim();

    // 过滤条件：太短、太长、或包含过多乱码字符的行不作为标题
    if (firstLine.length === 0 || firstLine.length > 40) {
      return '';
    }

    // 去除开头的标点符号、数字编号等（如 "1. "、". "、"（一）"）
    const cleaned = firstLine
      .replace(/^[\d]+\.\s*/, '')
      .replace(/^[.、,，]\s*/, '')
      .replace(/^[(（【\[「]\s*/, '')
      .trim();

    if (cleaned.length === 0) {
      return '';
    }

    // 统计中文字符和英文字母的比例，乱码行通常包含大量非常规字符
    const chineseChars = (cleaned.match(/[一-龥]/g) || []).length;
    const englishLetters = (cleaned.match(/[a-zA-Z]/g) || []).length;
    const totalReadable = chineseChars + englishLetters;

    // 可读字符占比过低（低于40%），认为是乱码
    if (cleaned.length > 0 && totalReadable / cleaned.length < 0.4) {
      return '';
    }

    // 纯数字或纯标点符号的行不作为标题
    if (/^[\d\s.\-,;:!?，。；：！？]+$/.test(cleaned)) {
      return '';
    }

    // 过滤常见的 PDF 提取乱码模式（如连续特殊符号、编码残留）
    if (/[ç¥èæä°™©®]/.test(cleaned)) {
      return '';
    }

    return cleaned;
  }

  private addOverlap(chunks: DocChunk[], overlap: number): DocChunk[] {
    if (chunks.length <= 1 || overlap <= 0) {
      return chunks;
    }

    return chunks.map((chunk, index) => {
      if (index === 0) return chunk;

      const prevChunk = chunks[index - 1];
      const overlapText = prevChunk.content.slice(-overlap);

      return {
        ...chunk,
        content: overlapText + chunk.content,
        metadata: {
          ...chunk.metadata,
          startOffset: chunk.metadata.startOffset - overlapText.length,
        },
      };
    });
  }

  countTokens(text: string): number {
    const chineseChars = (text.match(/[一-龥]/g) || []).length;
    const englishWords = text
      .replace(/[一-龥]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 0).length;
    return chineseChars + englishWords;
  }
}
