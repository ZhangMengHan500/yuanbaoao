import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PromptService } from '../llm/prompt.service';
import { IImageGenProvider } from './image-gen.provider';
import * as fs from 'fs';
import * as path from 'path';
import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';
import fetch from 'node-fetch';

const REDIS_KEY_PREFIX = 'smart-edit:progress:';

@Injectable()
export class SmartEditService {
  private readonly logger = new Logger(SmartEditService.name);
  private redis: Redis;

  constructor(
    private prisma: PrismaService,
    private promptService: PromptService,
    @Inject('IMAGE_GEN_PROVIDER') private imageGenProvider: IImageGenProvider,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.connect().catch((err) => {
      this.logger.error(`[SmartEdit] Redis 连接失败: ${err.message}`);
    });
  }

  async submitJob(
    userId: string | undefined,
    params: {
      imageBuffer?: Buffer;
      imageUrl?: string;
      filename: string;
      tool: string;
      prompt?: string;
      ratio?: string;
    },
  ) {
    // 开发测试：如果未登录，使用数据库中的第一个用户
    const jobId = uuid();

    let imageBuffer = params.imageBuffer;
    if (!imageBuffer && params.imageUrl) {
      const imageUrl = params.imageUrl;
      if (imageUrl.startsWith('data:')) {
        const base64Data = imageUrl.split(',')[1];
        if (base64Data) {
          imageBuffer = Buffer.from(base64Data, 'base64');
        }
      } else if (imageUrl.startsWith('/uploads/')) {
        const localPath = path.join(process.cwd(), imageUrl);
        if (fs.existsSync(localPath)) {
          imageBuffer = fs.readFileSync(localPath);
        }
      } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        const res = await fetch(imageUrl);
        if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
        imageBuffer = Buffer.from(await res.arrayBuffer());
      }
    }
    if (!imageBuffer) {
      throw new Error('No image provided');
    }

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const ext = path.extname(params.filename) || '.png';
    const refFilename = `${jobId}_ref${ext}`;
    const refPath = path.join(uploadDir, refFilename);
    fs.writeFileSync(refPath, imageBuffer);

    let finalPrompt = params.prompt || '';
    if (params.tool && !finalPrompt) {
      finalPrompt = this.getToolPrompt(params.tool, params.ratio);
    }

    await this.prisma.imageJob.create({
      data: {
        id: jobId,
        userId: userId,
        jobType: 'smart-edit',
        status: 'processing',
        prompt: finalPrompt,
        referenceImageUrl: `/uploads/${refFilename}`,
      },
    });

    await this.redis.set(
      `${REDIS_KEY_PREFIX}${jobId}`,
      JSON.stringify({ step: 0, totalSteps: 30, percent: 0, status: 'processing' }),
      'EX',
      3600,
    );

    this.processJob(jobId, refPath, finalPrompt, params.tool);

    return { jobId, status: 'processing' };
  }

  private getToolPrompt(tool: string, ratio?: string): string {
    const prompts: Record<string, string> = {
      enhance: '高清修复，提升图片清晰度和细节，Real-ESRGAN超分辨率处理',
      beauty: '人像美颜，优化肤质，磨皮美白，自然美颜效果',
      remove: '去除杂物，局部重绘，图像修复，智能填充',
      beautify: '图片美化，优化光影色彩，提升整体画面质感',
      expand: ratio
        ? `智能扩图，将图片扩展为${ratio}比例，外绘扩展画面边界，保持风格一致`
        : '智能扩图，外绘扩展画面边界，保持风格一致',
      style: '风格迁移，将图片转换为指定艺术风格',
      ratio: ratio
        ? `比例调整，将图片调整为${ratio}比例，智能裁剪调整画面比例`
        : '比例调整，智能裁剪调整画面比例',
    };
    return prompts[tool] || '智能P图处理';
  }

  private async processJob(
    jobId: string,
    refImagePath: string,
    prompt: string,
    tool: string,
  ) {
    try {
      await this.updateRedisProgress(jobId, { step: 1, totalSteps: 30, percent: 3, status: 'processing' });

      const result = await this.imageGenProvider.generateImage(prompt, {
        referenceImageUrl: refImagePath,
        width: 512,
        height: 512,
      });

      if (result.status === 'completed') {
        await this.prisma.imageJob.update({
          where: { id: jobId },
          data: { status: 'completed', resultImageUrl: result.imageUrl },
        });

        await this.updateRedisProgress(jobId, {
          step: 30, totalSteps: 30, percent: 100,
          status: 'completed', resultUrl: result.imageUrl,
        });

        this.logger.log(`SmartEdit Job ${jobId}: Completed`);
      } else {
        throw new Error(result.error || '处理失败');
      }
    } catch (error: any) {
      this.logger.error(`SmartEdit Job ${jobId}: Failed - ${error.message}`);

      await this.prisma.imageJob.update({
        where: { id: jobId },
        data: { status: 'failed', errorMsg: error.message },
      });

      await this.updateRedisProgress(jobId, {
        step: 0, totalSteps: 30, percent: 0,
        status: 'failed', error: error.message,
      });
    }
  }

  private async updateRedisProgress(jobId: string, data: Record<string, any>) {
    await this.redis.set(
      `${REDIS_KEY_PREFIX}${jobId}`,
      JSON.stringify(data),
      'EX',
      3600,
    );
  }

  async getProgress(jobId: string) {
    const data = await this.redis.get(`${REDIS_KEY_PREFIX}${jobId}`);
    if (!data) return null;
    return JSON.parse(data);
  }

  async getJobStatus(jobId: string, userId: string) {
    return this.prisma.imageJob.findFirst({
      where: { id: jobId, userId },
    });
  }
}
