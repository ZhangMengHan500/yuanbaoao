import {
  Controller,
  Post,
  Body,
  UseGuards,
  Res,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { WritingService } from './writing.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IsString, IsNotEmpty, IsObject } from 'class-validator';

class WritingGenerateDto {
  @IsString()
  @IsNotEmpty({ message: '写作类型不能为空' })
  writingType: string;

  @IsObject()
  @IsNotEmpty({ message: '筛选条件不能为空' })
  filters: Record<string, string>;

  @IsString()
  @IsNotEmpty({ message: '主题不能为空' })
  topic: string;
}

@Controller('writing')
@UseGuards(JwtAuthGuard)
export class WritingController {
  constructor(private readonly writingService: WritingService) {}

  @Post('generate')
  @HttpCode(200)
  async generate(
    @Body() dto: WritingGenerateDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const systemPrompt = this.writingService.buildPrompt(dto);

      console.log('[Writing] 开始生成, 主题:', dto.topic, '类型:', dto.writingType, '筛选:', JSON.stringify(dto.filters));

      let fullResponse = '';
      for await (const token of this.writingService.streamWrite(dto.topic, systemPrompt)) {
        fullResponse += token;
        res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
      }

      console.log('[Writing] 生成完成, 总字数:', fullResponse.length);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error('[Writing] 生成错误:', error);
      res.write(
        `data: ${JSON.stringify({ error: error.message || '生成失败' })}\n\n`,
      );
      res.end();
    }
  }
}
