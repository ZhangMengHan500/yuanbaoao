import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PromptService } from '../llm/prompt.service';
import { IImageGenProvider } from './image-gen.provider';
import * as fs from 'fs';
import * as path from 'path';
import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';
import fetch from 'node-fetch';

const REDIS_KEY_PREFIX = 'img2img:progress:';

@Injectable()
export class Img2ImgService {
  private readonly logger = new Logger(Img2ImgService.name);
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
      this.logger.error(`[Img2Img] Redis 连接失败: ${err.message}`);
    });
  }

  // 提交图生图任务
  async submitJob(
    userId: string | undefined,
    params: {
      imageBuffer?: Buffer;
      imageUrl?: string;
      filename: string;
      prompt: string;
      negativePrompt?: string;
      strength?: number;
      templateId?: string;
    },
  ) {
    // 开发测试：如果未登录，使用数据库中的第一个用户
    const jobId = uuid();

    // 获取图片 Buffer：优先使用上传的文件，否则从 URL / data URI 解析
    let imageBuffer = params.imageBuffer;
    if (!imageBuffer && params.imageUrl) {
      const imageUrl = params.imageUrl;
      if (imageUrl.startsWith('data:')) {
        // data:image/png;base64,xxxxx → 解码 base64
        const base64Data = imageUrl.split(',')[1];
        if (base64Data) {
          imageBuffer = Buffer.from(base64Data, 'base64');
        }
      } else if (imageUrl.startsWith('/uploads/')) {
        // 本地 uploads 路径，直接读文件（避免请求自己导致死锁）
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

    // 保存参考图到本地
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const ext = path.extname(params.filename) || '.png';
    const refFilename = `${jobId}_ref${ext}`;
    const refPath = path.join(uploadDir, refFilename);
    fs.writeFileSync(refPath, imageBuffer);

    // 使用 LangChain 优化提示词（如果有模板则结合模板风格）
    let finalPrompt = params.prompt;
    if (params.templateId) {
      const template = await this.prisma.aiStyleTemplate.findUnique({
        where: { id: params.templateId },
      });
      if (template) {
        finalPrompt = await this.promptService.composeImg2ImgPrompt(
          template.prompt,
          params.prompt || '用户上传的人像照片',
        );
      }
    }

    // 创建数据库记录
    await this.prisma.imageJob.create({
      data: {
        id: jobId,
        userId: userId,
        templateId: params.templateId,
        jobType: 'img2img',
        status: 'processing',
        prompt: finalPrompt,
        negativePrompt: params.negativePrompt,
        referenceImageUrl: `/uploads/${refFilename}`,
        stylePrompt: params.templateId
          ? (await this.prisma.aiStyleTemplate.findUnique({ where: { id: params.templateId } }))?.prompt
          : undefined,
      },
    });

    // 初始化 Redis 进度
    await this.redis.set(
      `${REDIS_KEY_PREFIX}${jobId}`,
      JSON.stringify({ step: 0, totalSteps: 30, percent: 0, status: 'processing' }),
      'EX',
      3600,
    );

    // 异步调用图片生成（不阻塞响应）
    this.processJob(jobId, refPath, finalPrompt, params.negativePrompt);

    return { jobId, status: 'processing' };
  }

  // 异步处理生成任务
  private async processJob(
    jobId: string,
    refImagePath: string,
    prompt: string,
    negativePrompt?: string,
  ) {
    try {
      // 先通知开始
      await this.updateRedisProgress(jobId, { step: 1, totalSteps: 30, percent: 3, status: 'processing' });

      // 调用 SiliconFlow API（通过 Provider）
      const result = await this.imageGenProvider.generateImage(prompt, {
        negativePrompt,
        referenceImageUrl: refImagePath,
        width: 512,
        height: 512,
      });

      if (result.status === 'completed') {
        // 更新数据库
        await this.prisma.imageJob.update({
          where: { id: jobId },
          data: { status: 'completed', resultImageUrl: result.imageUrl },
        });

        // 更新 Redis 为完成
        await this.updateRedisProgress(jobId, {
          step: 30, totalSteps: 30, percent: 100,
          status: 'completed', resultUrl: result.imageUrl,
        });

        this.logger.log(`Job ${jobId}: Completed`);
      } else {
        throw new Error(result.error || '生成失败');
      }
    } catch (error: any) {
      this.logger.error(`Job ${jobId}: Failed - ${error.message}`);

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

  // 根据模板生成提示词（LangChain）
  async generatePrompt(templateId: string, referenceDescription?: string) {
    const template = await this.prisma.aiStyleTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) throw new NotFoundException('模板不存在');

    const prompt = await this.promptService.composeImg2ImgPrompt(
      template.prompt,
      referenceDescription || '用户上传的人像照片',
    );

    return {
      templateId,
      templateName: template.name,
      stylePrompt: template.prompt,
      generatedPrompt: prompt,
    };
  }

  // 获取当前进度
  async getProgress(jobId: string) {
    const data = await this.redis.get(`${REDIS_KEY_PREFIX}${jobId}`);
    if (!data) return null;
    return JSON.parse(data);
  }

  // 查询任务状态
  async getJobStatus(jobId: string, userId: string | undefined) {
    // 开发测试：如果未登录，使用数据库中的第一个用户
    return this.prisma.imageJob.findFirst({
      where: { id: jobId, userId: userId },
    });
  }
}
