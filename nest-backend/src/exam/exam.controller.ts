import {
  Controller, Post, Body, UploadedFile, UseInterceptors,
  UseGuards, Res, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ExamService } from './exam.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

class ParseExamDto {
  @IsString()
  imageUrl: string;
}

class GenerateSimilarDto {
  @IsString()
  imageUrl: string;
  @IsOptional()
  @IsNumber()
  count?: number;
}

class GenerateReviewDto {
  @IsString()
  imageUrl: string;
  @IsOptional()
  @IsArray()
  weakPoints?: string[];
}

class GenerateCustomDto {
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() grade?: string;
  @IsOptional() @IsString() questionTypes?: string;
  @IsOptional() @IsNumber() questionCount?: number;
  @IsOptional() @IsString() difficulty?: string;
  @IsOptional() @IsString() knowledgePoints?: string;
  @IsOptional() @IsString() description?: string;
}

@Controller('exam')
@UseGuards(JwtAuthGuard)
@Public() // 临时禁用认证，方便开发测试
export class ExamController {
  constructor(private examService: ExamService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadExam(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('请上传试卷图片');
    return { url: `/uploads/exam/${file.filename}`, filename: file.filename, size: file.size };
  }

  @Post('generate/similar')
  async generateSimilar(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateSimilarDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    try {
      const content = await this.examService.parseExamImage(dto.imageUrl);
      for await (const token of this.examService.generateSimilarExam(content, dto.count)) {
        res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }

  @Post('generate/review')
  async generateReview(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateReviewDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    try {
      const content = await this.examService.parseExamImage(dto.imageUrl);
      for await (const token of this.examService.generateReviewExam(content, dto.weakPoints || [])) {
        res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }

  @Post('generate/custom')
  async generateCustom(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateCustomDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    try {
      for await (const token of this.examService.generateCustomExam(dto)) {
        res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
}
