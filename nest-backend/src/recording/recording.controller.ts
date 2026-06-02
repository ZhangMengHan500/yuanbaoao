import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { RecordingService } from './recording.service';

@Controller('recording')
export class RecordingController {
  private readonly logger = new Logger(RecordingController.name);

  constructor(private readonly recordingService: RecordingService) {}

  /**
   * 处理录音：ASR → AI总结 → 返回流式结果
   * POST /recording/process
   */
  @Post('process')
  @HttpCode(200)
  async processAudio(
    @Body() body: any,
    @Res() res: Response,
  ) {
    this.logger.log(`收到请求, body keys: ${JSON.stringify(Object.keys(body || {}))}`);
    this.logger.log(`body type: ${typeof body}, audioBase64: ${body?.audioBase64 ? 'exists' : 'missing'}`);

    const audioBase64 = body?.audioBase64;
    if (!audioBase64) {
      this.logger.warn('audioBase64 is empty or missing');
      res.status(400).json({message: 'audioBase64 is required', received: JSON.stringify(body)});
      return;
    }

    this.logger.log('收到录音数据，开始处理...');

    // 设置 SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      // 1. 语音识别
      this.logger.log('步骤1: 语音识别...');
      const transcript = await this.recordingService.recognizeSpeech(
        audioBase64,
        body.format || 'wav',
      );

      // 发送识别结果
      res.write(`data: ${JSON.stringify({ type: 'transcript', text: transcript })}\n\n`);

      if (!transcript || transcript.trim().length === 0) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: '未能识别到语音内容' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      // 2. AI 生成回答
      this.logger.log('步骤2: AI生成回答...');
      const userPrompt = body.prompt
        ? `${body.prompt}\n\n识别内容：${transcript}`
        : `请对以下语音转写内容进行分析和回答：\n\n${transcript}`;

      let aiResponse = '';
      for await (const token of this.recordingService.streamAIResponse(userPrompt)) {
        aiResponse += token;
        res.write(`data: ${JSON.stringify({ type: 'ai_token', token })}\n\n`);
      }

      // 3. 可选：语音合成（TTS）
      this.logger.log('步骤3: 完成');
      res.write(`data: ${JSON.stringify({ type: 'done', fullText: aiResponse })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      this.logger.error('录音处理失败:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || '处理失败' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }

  /**
   * 语音合成
   * POST /recording/tts
   */
  @Post('tts')
  @HttpCode(200)
  async textToSpeech(
    @Body() body: { text: string },
    @Res() res: Response,
  ) {
    if (!body.text) {
      res.status(400).json({message: 'text is required'});
      return;
    }

    try {
      const audioBuffer = await this.recordingService.synthesizeSpeech(body.text);

      if (audioBuffer.length === 0) {
        res.status(204).end();
        return;
      }

      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Length', audioBuffer.length.toString());
      res.end(audioBuffer);
    } catch (error) {
      this.logger.error('TTS失败:', error);
      res.status(500).json({ message: '语音合成失败' });
    }
  }

  /**
   * AI结构化总结（流式）
   * POST /recording/summary
   */
  @Post('summary')
  @HttpCode(200)
  async generateSummary(
    @Body() body: { text: string; duration?: string },
    @Res() res: Response,
  ) {
    this.logger.log('收到总结请求');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      let fullText = '';
      for await (const token of this.recordingService.streamSummary(body.text, body.duration)) {
        fullText += token;
        res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ type: 'done', fullText })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      this.logger.error('总结生成失败:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || '生成失败' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }

  /**
   * AI深度分析（流式）
   * POST /recording/analysis
   */
  @Post('analysis')
  @HttpCode(200)
  async generateAnalysis(
    @Body() body: { text: string; duration?: string },
    @Res() res: Response,
  ) {
    this.logger.log('收到分析请求');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      let fullText = '';
      for await (const token of this.recordingService.streamAnalysis(body.text, body.duration)) {
        fullText += token;
        res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ type: 'done', fullText })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      this.logger.error('分析生成失败:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || '生成失败' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
}
