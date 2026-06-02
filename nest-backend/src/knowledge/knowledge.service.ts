import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../llm/rag.service';

@Injectable()
export class KnowledgeService {
  constructor(
    private prisma: PrismaService,
    private ragService: RagService,
  ) {}

  async getDocuments() {
    return this.prisma.knowledgeDoc.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDocumentById(id: string) {
    const doc = await this.prisma.knowledgeDoc.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('文档不存在');
    return doc;
  }

  async addDocument(data: {
    title: string;
    content: string;
    docType?: string;
    source?: string;
  }) {
    const doc = await this.prisma.knowledgeDoc.create({
      data: {
        title: data.title,
        content: data.content,
        docType: data.docType || 'text',
        source: data.source,
      },
    });

    const ragResult = await this.ragService.addDocument(doc.id, doc.title, doc.content);

    return { ...doc, vectorChunks: ragResult.added };
  }

  // 从上传的文件解析内容并存入知识库
  async addDocumentFromFile(file: Express.Multer.File) {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    let content = '';

    if (ext === 'txt' || ext === 'md') {
      content = file.buffer.toString('utf-8');
    } else if (ext === 'pdf') {
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(file.buffer);
      content = pdfData.text;
    } else {
      throw new BadRequestException('仅支持 .txt 和 .pdf 文件');
    }

    if (!content.trim()) {
      throw new BadRequestException('文件内容为空');
    }

    // 处理文件名编码问题 - 尝试多种编码方式
    let title = file.originalname.replace(/\.[^.]+$/, '');

    // 如果文件名包含乱码字符，尝试从文件内容中提取标题
    if (title.match(/[çèéêëàâäùûüôöîï]/) || title.length < 2) {
      // 尝试使用Buffer重新编码
      try {
        const buffer = Buffer.from(file.originalname, 'latin1');
        title = buffer.toString('utf-8').replace(/\.[^.]+$/, '');
      } catch (e) {
        // 如果失败，使用文件内容的第一行作为标题
        const firstLine = content.split('\n')[0]?.trim();
        if (firstLine && firstLine.length > 0 && firstLine.length < 100) {
          title = firstLine;
        }
      }
    }

    return this.addDocument({
      title,
      content,
      docType: ext,
      source: file.originalname,
    });
  }

  async deleteDocument(id: string) {
    const doc = await this.prisma.knowledgeDoc.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('文档不存在');

    await this.ragService.deleteDocument(id);
    await this.prisma.knowledgeDoc.delete({ where: { id } });

    return { deleted: true };
  }

  async searchDocuments(query: string) {
    return this.prisma.knowledgeDoc.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { content: { contains: query } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
