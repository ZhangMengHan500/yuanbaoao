import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DocService } from '../services/doc.service';
import { DocQAService } from '../services/doc-qa.service';
import { DocSummaryService } from '../services/doc-summary.service';
import { UploadDocDto } from '../dto/upload-doc.dto';
import { QARequestDto } from '../dto/qa-request.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('doc-reader')
@UseGuards(JwtAuthGuard)
@Public() // 临时禁用认证，方便开发测试
export class DocReaderController {
  constructor(
    private docService: DocService,
    private qaService: DocQAService,
    private summaryService: DocSummaryService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocDto,
  ) {
    return this.docService.uploadDocument(userId, file, dto.title);
  }

  @Get('documents')
  async getDocuments(@CurrentUser('id') userId: string) {
    return this.docService.getDocuments(userId);
  }

  @Get('documents/:id')
  async getDocument(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.docService.getDocumentById(id, userId);
  }

  @Get('documents/:id/status')
  async getDocumentStatus(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.docService.getDocumentStatus(id, userId);
  }

  @Get('documents/:id/content')
  async getDocumentContent(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return this.docService.getDocumentContent(id, userId, page, pageSize);
  }

  @Get('documents/:id/summary')
  async getDocumentSummary(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    await this.docService.getDocumentById(id, userId);
    return this.summaryService.getSummaries(id);
  }

  @Delete('documents/:id')
  async deleteDocument(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.docService.deleteDocument(id, userId);
  }

  @Get('chunks/:id')
  async getChunk(@Param('id') id: string) {
    return this.docService.getChunkById(id);
  }

  @Post('conversations')
  async createConversation(
    @CurrentUser('id') userId: string,
    @Body('documentId') documentId: string,
  ) {
    return this.qaService.createConversation(documentId, userId);
  }

  @Get('conversations')
  async getConversations(
    @CurrentUser('id') userId: string,
    @Query('documentId') documentId: string,
  ) {
    return this.qaService.getConversations(documentId, userId);
  }

  @Get('conversations/:id/messages')
  async getMessages(@Param('id') id: string) {
    return this.qaService.getMessages(id);
  }

  @Post('conversations/:id/chat')
  async chat(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: QARequestDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const event of this.qaService.streamChat(id, userId, dto.message)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      res.end();
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }
}
