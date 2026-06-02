import { Injectable, Logger } from '@nestjs/common';

// 图片生成结果
export interface ImageGenResult {
  imageUrl: string;
  status: 'completed' | 'failed';
  error?: string;
}

// 图片生成提供者接口 - 替换实现即可切换底层 API（DALL-E / Stable Diffusion 等）
export interface IImageGenProvider {
  generateImage(
    prompt: string,
    options?: {
      negativePrompt?: string;
      referenceImageUrl?: string;
      width?: number;
      height?: number;
    },
  ): Promise<ImageGenResult>;
}

// Mock 实现 - 返回占位图，开发阶段使用
// 替换为真实 API 只需新建一个类实现 IImageGenProvider 接口，然后在 module 中替换 provider
@Injectable()
export class MockImageGenProvider implements IImageGenProvider {
  private readonly logger = new Logger(MockImageGenProvider.name);

  async generateImage(
    prompt: string,
    options?: {
      negativePrompt?: string;
      referenceImageUrl?: string;
      width?: number;
      height?: number;
    },
  ): Promise<ImageGenResult> {
    this.logger.log(`[MOCK] 生成图片，prompt: ${prompt.substring(0, 80)}...`);

    // 模拟 2 秒延迟
    await new Promise(resolve => setTimeout(resolve, 2000));

    const w = options?.width || 512;
    const h = options?.height || 512;

    return {
      imageUrl: `https://placehold.co/${w}x${h}/1a1a2e/7c6aef?text=AI+Generated`,
      status: 'completed',
    };
  }
}
