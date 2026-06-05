import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KnowledgeService } from './knowledge.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

// 添加知识文档 DTO（文本方式）
class CreateKnowledgeDto {
  @IsString()
  @IsNotEmpty({ message: '文档标题不能为空' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: '文档内容不能为空' })
  content: string;

  @IsOptional()
  @IsString()
  docType?: string;

  @IsOptional()
  @IsString()
  source?: string;
}

// 知识库控制器
@Controller('knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  async getDocuments() {
    return this.knowledgeService.getDocuments();
  }

  @Get('search')
  async searchDocuments(@Query('q') query: string) {
    if (!query) {
      return this.knowledgeService.getDocuments();
    }
    return this.knowledgeService.searchDocuments(query);
  }

  @Get(':id')
  async getDocument(@Param('id', ParseUUIDPipe) id: string) {
    return this.knowledgeService.getDocumentById(id);
  }

  // 文本方式添加文档
  @Post()
  async addDocument(@Body() dto: CreateKnowledgeDto) {
    return this.knowledgeService.addDocument(dto);
  }

  // 文件上传方式添加文档（.txt / .pdf）
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('请选择文件');
    }
    return this.knowledgeService.addDocumentFromFile(file);
  }

  @Delete(':id')
  async deleteDocument(@Param('id', ParseUUIDPipe) id: string) {
    return this.knowledgeService.deleteDocument(id);
  }
}
