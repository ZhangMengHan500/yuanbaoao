import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocChunkerService } from './doc-chunker.service';
import { DocEmbeddingService } from './doc-embedding.service';
import { DocSummaryService } from './doc-summary.service';
import pdfParse = require('pdf-parse');
import * as fs from 'fs';
import * as path from 'path';

const PARSE_TIMEOUT_MS = 120 * 1000; // 2 minutes timeout for parsing
const SUPPORTED_EXTENSIONS = ['.pdf', '.txt'];

@Injectable()
export class DocService {
  constructor(
    private prisma: PrismaService,
    private chunkerService: DocChunkerService,
    private embeddingService: DocEmbeddingService,
    private summaryService: DocSummaryService,
  ) {}

  async uploadDocument(
    userId: string,
    file: Express.Multer.File,
    title?: string,
  ) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException('仅支持 PDF 和 TXT 文件');
    }

    const fileUrl = file.path;
    const fileSize = file.size;
    const fileType = ext === '.pdf' ? 'pdf' : 'txt';

    const doc = await this.prisma.readingDoc.create({
      data: {
        user: { connect: { id: userId } },
        title: title || this.cleanFileName(file.originalname),
        fileUrl,
        fileType,
        fileSize,
        status: 'parsing',
      },
    });

    this.parseDocumentWithTimeout(doc.id, fileUrl, fileType).catch(error => {
      console.error(`[DocService] 解析失败: ${error.message}`);
      this.prisma.readingDoc.update({
        where: { id: doc.id },
        data: { status: 'error', parseError: error.message },
      });
    });

    return doc;
  }

  private async parseDocumentWithTimeout(docId: string, fileUrl: string, fileType: string) {
    const parsePromise = this.parseDocument(docId, fileUrl, fileType);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('文档解析超时，请检查文档是否损坏'));
      }, PARSE_TIMEOUT_MS);
    });

    return Promise.race([parsePromise, timeoutPromise]);
  }

  private async parseDocument(docId: string, fileUrl: string, fileType: string) {
    console.log(`[DocService] 开始解析文档: ${docId} (类型: ${fileType})`);

    let text: string;
    let pageCount: number | undefined;

    if (fileType === 'pdf') {
      const buffer = fs.readFileSync(fileUrl);
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
      pageCount = pdfData.numpages;
    } else {
      // TXT file - read as UTF-8 text
      text = fs.readFileSync(fileUrl, 'utf-8');
      pageCount = undefined;
    }

    const wordCount = this.chunkerService.countTokens(text);

    await this.prisma.readingDoc.update({
      where: { id: docId },
      data: { pageCount, wordCount },
    });

    const chunks = this.chunkerService.splitIntoChunks(text, docId);
    console.log(`[DocService] 分块完成: ${chunks.length} 个块`);

    const dbChunks = await Promise.all(
      chunks.map((chunk, index) =>
        this.prisma.readingChunk.create({
          data: {
            documentId: docId,
            content: chunk.content,
            chunkIndex: index,
            pageNumber: chunk.metadata.page,
            paragraphNum: chunk.metadata.paragraph,
            title: chunk.metadata.title,
            startOffset: chunk.metadata.startOffset,
            endOffset: chunk.metadata.endOffset,
            tokenCount: this.chunkerService.countTokens(chunk.content),
          },
        }),
      ),
    );

    const vectorIds = await this.embeddingService.storeChunks(docId, chunks);

    await Promise.all(
      dbChunks.map((dbChunk, index) =>
        this.prisma.readingChunk.update({
          where: { id: dbChunk.id },
          data: { vectorId: vectorIds[index] },
        }),
      ),
    );

    await this.summaryService.generateSummaries(docId, chunks);

    await this.prisma.readingDoc.update({
      where: { id: docId },
      data: { status: 'ready' },
    });

    console.log(`[DocService] 文档解析完成: ${docId}`);
  }

  async getDocuments(userId: string) {
    return this.prisma.readingDoc.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        fileType: true,
        fileSize: true,
        pageCount: true,
        wordCount: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async getDocumentById(docId: string, userId: string) {
    const doc = await this.prisma.readingDoc.findFirst({
      where: { id: docId, userId },
    });

    if (!doc) {
      throw new NotFoundException('文档不存在');
    }

    return doc;
  }

  async getDocumentContent(docId: string, userId: string, page: number = 1, pageSize: number = 20) {
    await this.getDocumentById(docId, userId);

    const chunks = await this.prisma.readingChunk.findMany({
      where: { documentId: docId },
      orderBy: { chunkIndex: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const total = await this.prisma.readingChunk.count({
      where: { documentId: docId },
    });

    return {
      chunks,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getDocumentStatus(docId: string, userId: string) {
    const doc = await this.getDocumentById(docId, userId);
    return { status: doc.status, parseError: doc.parseError };
  }

  async deleteDocument(docId: string, userId: string) {
    const doc = await this.getDocumentById(docId, userId);

    await this.embeddingService.deleteDocument(docId);

    if (fs.existsSync(doc.fileUrl)) {
      fs.unlinkSync(doc.fileUrl);
    }

    await this.prisma.readingDoc.delete({ where: { id: docId } });

    return { deleted: true };
  }

  async getChunkById(chunkId: string) {
    const chunk = await this.prisma.readingChunk.findUnique({
      where: { id: chunkId },
      include: { document: true },
    });

    if (!chunk) {
      throw new NotFoundException('文档片段不存在');
    }

    return chunk;
  }

  // 清理文件名：去除扩展名、修复编码乱码、生成可读标题
  private cleanFileName(originalname: string): string {
    // 去掉扩展名
    let name = originalname.replace(/\.(pdf|txt)$/i, '').trim();

    // 去除常见编码乱码字符
    name = name.replace(/[ç¥èæä°™©®ï»¿]/g, '');

    // 去除多余空白和特殊符号
    name = name.replace(/[_\-\s]+/g, ' ').trim();

    // 如果清理后为空，根据文件类型生成默认标题
    if (!name || name.length < 1) {
      const ext = path.extname(originalname).toLowerCase();
      return ext === '.pdf' ? 'PDF文档' : 'TXT文档';
    }

    return name;
  }
}
