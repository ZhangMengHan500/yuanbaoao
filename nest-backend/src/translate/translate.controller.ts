import { Controller, Post, Body, Res, UseGuards, HttpCode } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { TranslateService } from './translate.service';

@Controller('translate')
@UseGuards(JwtAuthGuard)
@Public() // 临时禁用认证，方便开发测试
export class TranslateController {
  constructor(private readonly translateService: TranslateService) {}

  @Post('stream')
  @HttpCode(200)
  async streamTranslate(
    @Body() body: { text: string; sourceLang: string; targetLang: string },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      let fullText = '';
      for await (const token of this.translateService.streamTranslate(
        body.text,
        body.sourceLang,
        body.targetLang,
      )) {
        fullText += token;
        res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ type: 'done', fullText })}\n\n`);
      res.write('data: [DONE]\n\n');
    } catch (error: any) {
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`,
      );
    }
    res.end();
  }

  @Post('photo')
  @HttpCode(200)
  async photoTranslate(
    @Body()
    body: { imageBase64: string; sourceLang: string; targetLang: string },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const { originalText, translatedText } =
        await this.translateService.photoTranslate(
          body.imageBase64,
          body.sourceLang,
          body.targetLang,
        );
      res.write(
        `data: ${JSON.stringify({ type: 'ocr', text: originalText })}\n\n`,
      );
      res.write(
        `data: ${JSON.stringify({ type: 'token', token: translatedText })}\n\n`,
      );
      res.write(
        `data: ${JSON.stringify({ type: 'done', fullText: translatedText, ocrText: originalText })}\n\n`,
      );
      res.write('data: [DONE]\n\n');
    } catch (error: any) {
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`,
      );
    }
    res.end();
  }

  @Post('tts')
  @HttpCode(200)
  async translateTTS(
    @Body() body: { text: string; lang?: string },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'audio/wav');
    // 复用 recording 模块的 CosyVoice TTS
    // TODO: 完整实现 TTS 音频流
    res.end();
  }
}
