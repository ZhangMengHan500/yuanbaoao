import { Injectable, Logger } from '@nestjs/common';
import { IImageGenProvider, ImageGenResult } from './image-gen.provider';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

const SILICONFLOW_API = 'https://api.siliconflow.cn/v1/images/generations';
const SILICONFLOW_KEY = process.env.SILICONFLOW_API_KEY || '';
const OUTPUT_DIR = './uploads';

// 质量增强关键词（自动追加到每个提示词后面）
const QUALITY_SUFFIX =
  ', masterpiece, best quality, ultra detailed, 8k resolution, photorealistic, ' +
  'cinematic lighting, soft shadows, sharp focus, professional photography, ' +
  'high detail skin texture, beautiful facial features, film grain';

// 硅基流动 API 图片生成提供者
// 支持 txt2img 和 img2img
@Injectable()
export class SiliconFlowProvider implements IImageGenProvider {
  private readonly logger = new Logger(SiliconFlowProvider.name);

  // 自动优化提示词：追加质量关键词，提升画质
  private enhancePrompt(prompt: string): string {
    // 如果提示词已经包含质量关键词，则不重复追加
    if (prompt.includes('masterpiece') || prompt.includes('best quality') || prompt.includes('ultra detailed')) {
      return prompt;
    }
    return prompt + QUALITY_SUFFIX;
  }

  async generateImage(
    prompt: string,
    options?: {
      negativePrompt?: string;
      referenceImageUrl?: string;
      width?: number;
      height?: number;
    },
  ): Promise<ImageGenResult> {
    if (!SILICONFLOW_KEY) {
      return { imageUrl: '', status: 'failed', error: 'SILICONFLOW_API_KEY 未配置' };
    }

    const w = options?.width || 512;
    const h = options?.height || 512;

    const body: Record<string, any> = {
      model: 'Kwai-Kolors/Kolors',
      prompt: this.enhancePrompt(prompt),
      image_size: `${w}x${h}`,
      num_inference_steps: 30,
    };

    if (options?.negativePrompt) {
      body.negative_prompt = options.negativePrompt;
    }

    // img2img：将参考图转 base64 传入
    if (options?.referenceImageUrl) {
      const base64 = await this.imageToBase64(options.referenceImageUrl);
      if (base64) {
        body.image = base64;
      }
    }

    try {
      this.logger.log(`Calling SiliconFlow API, prompt: ${prompt.substring(0, 60)}...`);

      const response = await fetch(SILICONFLOW_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SILICONFLOW_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`SiliconFlow API error: ${response.status} - ${errText}`);
        return { imageUrl: '', status: 'failed', error: `API error: ${response.status}` };
      }

      const result = (await response.json()) as any;
      const imageUrl = result.images?.[0]?.url;

      if (!imageUrl) {
        return { imageUrl: '', status: 'failed', error: 'No image in response' };
      }

      // 下载图片保存到本地
      const filename = `${Date.now()}_generated.png`;
      const filepath = path.join(OUTPUT_DIR, filename);
      if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

      const imgRes = await fetch(imageUrl);
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      fs.writeFileSync(filepath, buffer);

      this.logger.log(`Image saved: ${filepath}`);
      return { imageUrl: `/uploads/${filename}`, status: 'completed' };
    } catch (error: any) {
      this.logger.error(`SiliconFlow failed: ${error.message}`);
      return { imageUrl: '', status: 'failed', error: error.message };
    }
  }

  // 将图片 URL 或本地路径转为 base64
  private async imageToBase64(imageSource: string): Promise<string | null> {
    try {
      let buffer: Buffer;

      if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
        const res = await fetch(imageSource);
        if (!res.ok) return null;
        buffer = Buffer.from(await res.arrayBuffer());
      } else if (fs.existsSync(imageSource)) {
        buffer = fs.readFileSync(imageSource);
      } else {
        return null;
      }

      // 检测 MIME 类型
      const ext = path.extname(imageSource).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
      };
      const mime = mimeMap[ext] || 'image/png';

      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch {
      return null;
    }
  }
}
