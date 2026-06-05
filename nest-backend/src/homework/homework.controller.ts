import {
  Controller,
  Post,
  Body,
  UseGuards,
  Res,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { readFileSync } from 'fs';
import { HomeworkService } from './homework.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

class GradeDto {
  @IsString()
  @IsNotEmpty({ message: '图片URL不能为空' })
  imageUrl: string;

  @IsOptional()
  @IsString()
  text?: string;
}

@Controller('homework')
@UseGuards(JwtAuthGuard)
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Post('grade')
  @HttpCode(200)
  async grade(
    @Body() dto: GradeDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const { imageUrl, text } = dto;

      // 读取图片并转为 base64
      let imageBase64 = '';
      let mimeType = 'image/jpeg';

      const uploadsMatch = imageUrl.match(/\/uploads\/.+/);
      if (uploadsMatch) {
        const filePath = join(process.cwd(), uploadsMatch[0]);
        const buf = readFileSync(filePath);
        imageBase64 = buf.toString('base64');
        const ext = uploadsMatch[0].split('.').pop()?.toLowerCase() || 'jpg';
        mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        console.log('[Homework] 图片已读取, base64长度:', imageBase64.length);
      }

      if (!imageBase64) {
        res.write(`data: ${JSON.stringify({ error: '无法读取图片' })}\n\n`);
        res.end();
        return;
      }

      // 流式调用批改服务（PaddleOCR + DashScope）
      console.log('[Homework] 开始批改...');
      let fullResponse = '';
      for await (const token of this.homeworkService.streamGrade(
        imageBase64,
        mimeType,
        text || '',
      )) {
        fullResponse += token;
        res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error('[Homework] 批改错误:', error);
      res.write(
        `data: ${JSON.stringify({ error: error.message || '批改失败' })}\n\n`,
      );
      res.end();
    }
  }
}
