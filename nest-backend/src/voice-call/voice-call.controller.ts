import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RecordingService } from '../recording/recording.service';

@Controller('voice-call')
export class VoiceCallController {
  private readonly logger = new Logger(VoiceCallController.name);

  constructor(
    private configService: ConfigService,
    private recordingService: RecordingService,
  ) {
    this.logger.log('VoiceCall controller ready');
  }

  @Post('tts')
  async tts(@Body() body: { text: string; voice?: string }): Promise<{ audio: string }> {
    const { text, voice = '七七' } = body;
    if (!text || !text.trim()) {
      return { audio: '' };
    }

    this.logger.log(`TTS request: text="${text.substring(0, 50)}...", voice=${voice}`);

    try {
      // 使用 DashScope TTS 服务
      const audioBuffer = await this.recordingService.synthesizeSpeech(text);

      if (audioBuffer && audioBuffer.length > 0) {
        // 将 Buffer 转为 base64
        const audioBase64 = audioBuffer.toString('base64');
        this.logger.log(`TTS success: ${audioBase64.length} chars base64`);
        return { audio: audioBase64 };
      }

      this.logger.warn('TTS returned empty audio');
      return { audio: '' };
    } catch (err) {
      this.logger.error(`TTS failed: ${err.message}`);
      return { audio: '' };
    }
  }
}
