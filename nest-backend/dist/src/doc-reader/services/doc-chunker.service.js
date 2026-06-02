"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocChunkerService = void 0;
const common_1 = require("@nestjs/common");
const DEFAULT_CONFIG = {
    chunkSize: 512,
    chunkOverlap: 128,
    separators: ['\n\n', '\n', '。', '；', '，', ' '],
};
let DocChunkerService = class DocChunkerService {
    splitIntoChunks(text, docId, config = DEFAULT_CONFIG) {
        const chunks = [];
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
                const subChunks = this.splitLongParagraph(paragraph, docId, pageNumber, paragraphNum, currentOffset, config);
                chunks.push(...subChunks);
            }
            else {
                const lastChunk = chunks[chunks.length - 1];
                if (lastChunk &&
                    lastChunk.content.length + paragraph.length + 2 <= config.chunkSize) {
                    lastChunk.content += '\n\n' + paragraph;
                    lastChunk.metadata.endOffset = currentOffset + paragraph.length;
                }
                else {
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
    splitLongParagraph(text, docId, page, paragraph, startOffset, config) {
        const chunks = [];
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
    extractTitle(text) {
        const firstLine = text.split('\n')[0].trim();
        if (firstLine.length === 0 || firstLine.length > 40) {
            return '';
        }
        const cleaned = firstLine
            .replace(/^[\d]+\.\s*/, '')
            .replace(/^[.、,，]\s*/, '')
            .replace(/^[(（【\[「]\s*/, '')
            .trim();
        if (cleaned.length === 0) {
            return '';
        }
        const chineseChars = (cleaned.match(/[一-龥]/g) || []).length;
        const englishLetters = (cleaned.match(/[a-zA-Z]/g) || []).length;
        const totalReadable = chineseChars + englishLetters;
        if (cleaned.length > 0 && totalReadable / cleaned.length < 0.4) {
            return '';
        }
        if (/^[\d\s.\-,;:!?，。；：！？]+$/.test(cleaned)) {
            return '';
        }
        if (/[ç¥èæä°™©®]/.test(cleaned)) {
            return '';
        }
        return cleaned;
    }
    addOverlap(chunks, overlap) {
        if (chunks.length <= 1 || overlap <= 0) {
            return chunks;
        }
        return chunks.map((chunk, index) => {
            if (index === 0)
                return chunk;
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
    countTokens(text) {
        const chineseChars = (text.match(/[一-龥]/g) || []).length;
        const englishWords = text
            .replace(/[一-龥]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 0).length;
        return chineseChars + englishWords;
    }
};
exports.DocChunkerService = DocChunkerService;
exports.DocChunkerService = DocChunkerService = __decorate([
    (0, common_1.Injectable)()
], DocChunkerService);
//# sourceMappingURL=doc-chunker.service.js.map