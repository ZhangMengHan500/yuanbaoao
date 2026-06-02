import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import RPCClient from '@alicloud/pop-core';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private client: any;

  constructor(private configService: ConfigService) {
    this.client = new RPCClient({
      accessKeyId: this.configService.get<string>('ALIBABA_ACCESS_KEY_ID') || '',
      accessKeySecret: this.configService.get<string>('ALIBABA_ACCESS_KEY_SECRET') || '',
      endpoint: 'https://ocr-api.cn-hangzhou.aliyuncs.com',
      apiVersion: '2021-07-07',
    });
  }

  async recognizeText(imageBase64: string): Promise<string> {
    try {
      const params = {
        ImageBase64: imageBase64,
      };

      const result = await this.client.request('RecognizeGeneral', params, {
        method: 'POST',
        formatParams: false,
      });

      const data = result as any;
      if (data?.Data?.Content) {
        return data.Data.Content;
      }

      this.logger.warn('OCR 返回无文字内容');
      return '';
    } catch (error: any) {
      this.logger.error('OCR 识别失败:', error.message);
      return '';
    }
  }
}
