import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import * as path from 'path';

@Controller('voice-call')
export class VoiceCallController {
  private readonly logger = new Logger(VoiceCallController.name);
  private readonly ttsScript: string;

  constructor(private configService: ConfigService) {
    this.ttsScript = path.join(process.cwd(), 'tts_server.py');
    this.logger.log(`VoiceCall controller ready, ttsScript: ${this.ttsScript}`);
  }

  @Post('tts')
  async tts(@Body() body: { text: string; voice?: string }): Promise<{ audio: string }> {
    const { text, voice = '七七' } = body;
    if (!text || !text.trim()) {
      return { audio: '' };
    }

    this.logger.log(`TTS request: text="${text.substring(0, 50)}...", voice=${voice}`);

    try {
      // 调用 Python TTS 脚本
      const audioBase64 = await this.callPythonTTS(text, voice);

      if (audioBase64 && audioBase64.length > 0) {
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

  /**
   * 调用 Python TTS 脚本
   */
  private callPythonTTS(text: string, voice: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const python = process.env.PYTHON || 'python';
      const input = JSON.stringify({ text, voice });

      const child = execFile(python, [this.ttsScript], {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
      }, (error, stdout, stderr) => {
        if (error) {
          this.logger.error(`Python TTS exec error: ${error.message}`);
          if (stderr) this.logger.error(`stderr: ${stderr.substring(0, 200)}`);
          reject(error);
          return;
        }
        resolve(stdout.trim());
      });

      // 通过 stdin 传递参数
      if (child.stdin) {
        child.stdin.write(input);
        child.stdin.end();
      }
    });
  }
}
