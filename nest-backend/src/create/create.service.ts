import {
  Injectable,
  Inject,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PromptService } from '../llm/prompt.service';
import { IImageGenProvider } from './image-gen.provider';
import { getHeroPrompt } from './hero-prompts';
import * as fs from 'fs';
import * as path from 'path';

// 创作服务 - 模板管理 + AI 图片生成任务
@Injectable()
export class CreateService {
  private readonly logger = new Logger(CreateService.name);

  constructor(
    private prisma: PrismaService,
    private promptService: PromptService,
    @Inject('IMAGE_GEN_PROVIDER') private imageGenProvider: IImageGenProvider,
  ) {}

  // 获取模板列表（分页 + 分类过滤）
  async getTemplates(params: {
    category?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { category, page = 1, pageSize = 20 } = params;
    const where = {
      isActive: true,
      ...(category && category !== '推荐' ? { category } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        orderBy: { sortOrder: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.template.count({ where }),
    ]);

    return { items, total, page, pageSize, hasMore: page * pageSize < total };
  }

  // 获取单个模板详情
  async getTemplate(id: string) {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('模板不存在');
    return template;
  }

  // 获取风格分类列表（含关联模板）
  async getStyleCategories() {
    return this.prisma.styleCategory.findMany({
      orderBy: { sort: 'desc' },
      include: {
        templates: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  // 获取风格模板列表（可按分类过滤）
  async getStyleTemplates(categoryId?: string) {
    const where = categoryId ? { categoryId } : {};
    return this.prisma.aiStyleTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { category: true },
    });
  }

  // 创建 AI 生图任务
  async createAiGenJob(
    userId: string | undefined,
    dto: {
      templateId?: string;
      userDescription: string;
      aspectRatio?: string;
      negativePrompt?: string;
      referenceImageUrl?: string;
    },
  ) {
    // 开发测试：如果未登录，使用数据库中的第一个用户
    const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
    // 1. 如果有模板，获取模板的 stylePrompt
    let stylePrompt = '';
    if (dto.templateId) {
      const template = await this.prisma.template.findUnique({
        where: { id: dto.templateId },
      });
      if (!template) throw new NotFoundException('模板不存在');
      stylePrompt = template.stylePrompt;
    }

    // 2. 用 LangChain 组合最终提示词
    const finalPrompt = await this.promptService.composeAiGenPrompt(
      stylePrompt || 'high quality, detailed',
      dto.userDescription,
      dto.aspectRatio,
    );

    // 3. 创建任务记录
    const job = await this.prisma.imageJob.create({
      data: {
        userId: effectiveUserId,
        templateId: dto.templateId,
        jobType: 'ai_gen',
        status: 'processing',
        prompt: finalPrompt,
        negativePrompt: dto.negativePrompt,
        stylePrompt,
        referenceImageUrl: dto.referenceImageUrl,
      },
    });

    // 4. 异步调用图片生成（不阻塞响应）
    this.processImageJob(job.id, finalPrompt, dto.negativePrompt, dto.referenceImageUrl);

    return job;
  }

  // 创建智能 P 图任务
  async createEditJob(
    userId: string | undefined,
    dto: { editInstruction: string; referenceImageUrl: string },
  ) {
    // 开发测试：如果未登录，使用数据库中的第一个用户
    const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
    const finalPrompt = await this.promptService.composeEditPrompt(
      dto.editInstruction,
    );

    const job = await this.prisma.imageJob.create({
      data: {
        userId: effectiveUserId,
        jobType: 'ai_edit',
        status: 'processing',
        prompt: finalPrompt,
        referenceImageUrl: dto.referenceImageUrl,
      },
    });

    this.processImageJob(
      job.id,
      finalPrompt,
      undefined,
      dto.referenceImageUrl,
    );

    return job;
  }

  // 创建王者 COS 任务
  async createCosJob(
    userId: string | undefined,
    dto: { characterName: string; referenceImageUrl: string },
  ) {
    // 开发测试：如果未登录，使用数据库中的第一个用户
    const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
    const heroPrompt = getHeroPrompt(dto.characterName);

    // 如果有参考图，用人脸融合模式；否则纯文生图
    const hasRef = dto.referenceImageUrl && dto.referenceImageUrl.trim();
    const finalPrompt = hasRef ? heroPrompt.cosPrompt : heroPrompt.previewPrompt;

    const job = await this.prisma.imageJob.create({
      data: {
        userId: effectiveUserId,
        jobType: 'cos',
        status: 'processing',
        prompt: finalPrompt,
        referenceImageUrl: hasRef ? dto.referenceImageUrl : undefined,
      },
    });

    this.processImageJob(
      job.id,
      finalPrompt,
      undefined,
      hasRef ? dto.referenceImageUrl : undefined,
    );

    return job;
  }

  // 获取所有英雄列表（从数据库）
  async getCosHeroes() {
    return this.prisma.cosHero.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  // 批量初始化英雄数据 + 生成预览图（仅在数据库为空时执行）
  async seedCosHeroes() {
    const count = await this.prisma.cosHero.count();
    if (count > 0) {
      return { message: '英雄数据已存在，跳过初始化', seeded: false };
    }

    const { HERO_PROMPTS } = await import('./hero-prompts');
    const heroes = [
      { name: '蚩妩', color: '#c026d3', desc: '九尾妖狐', sortOrder: 0 },
      { name: '大乔', color: '#3b82f6', desc: '沧海之曜', sortOrder: 1 },
      { name: '朵莉亚', color: '#06b6d4', desc: '人鱼之歌', sortOrder: 2 },
      { name: '李白', color: '#8b5cf6', desc: '青莲剑仙', sortOrder: 3 },
      { name: '貂蝉', color: '#ec4899', desc: '绝世舞姬', sortOrder: 4 },
      { name: '孙悟空', color: '#f59e0b', desc: '齐天大圣', sortOrder: 5 },
      { name: '韩信', color: '#ef4444', desc: '国士无双', sortOrder: 6 },
      { name: '赵云', color: '#10b981', desc: '龙胆银枪', sortOrder: 7 },
    ];

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const fetch = (await import('node-fetch')).default;
    const results: any[] = [];

    for (let i = 0; i < heroes.length; i++) {
      const hero = heroes[i];
      const heroPrompt = HERO_PROMPTS[hero.name];
      if (!heroPrompt) continue;

      // 每次请求间隔 20 秒，避免 API 限流（IPM ~3/min）
      if (i > 0) {
        await new Promise(r => setTimeout(r, 20000));
      }

      this.logger.log(`[COS Seed] Generating preview for ${hero.name}...`);

      let imageUrl: string | null = null;
      try {
        const result = await this.imageGenProvider.generateImage(heroPrompt.previewPrompt, {
          width: 768,
          height: 1024,
          negativePrompt: 'low quality, blurry, deformed, ugly, bad anatomy, bad hands, missing fingers, extra digits, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, bad proportions, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck',
        });

        if (result.status === 'completed' && result.imageUrl) {
          const safeName = hero.name.replace(/[^一-龥a-zA-Z0-9]/g, '_');
          const filename = `cos_hero_${safeName}.png`;
          const filepath = path.join(uploadDir, filename);

          let buffer: Buffer;
          if (result.imageUrl.startsWith('http')) {
            const res = await fetch(result.imageUrl);
            buffer = Buffer.from(await res.arrayBuffer());
          } else {
            buffer = fs.readFileSync(path.join(process.cwd(), result.imageUrl));
          }
          fs.writeFileSync(filepath, buffer);
          imageUrl = `/uploads/${filename}`;
        }
      } catch (err: any) {
        this.logger.warn(`[COS Seed] Failed to generate ${hero.name}: ${err.message}`);
      }

      const created = await this.prisma.cosHero.create({
        data: {
          name: hero.name,
          color: hero.color,
          desc: hero.desc,
          imageUrl,
          previewPrompt: heroPrompt.previewPrompt,
          cosPrompt: heroPrompt.cosPrompt,
          sortOrder: hero.sortOrder,
        },
      });
      results.push(created);
    }

    return { message: `初始化完成，共 ${results.length} 个英雄`, seeded: true, heroes: results };
  }

  // 查询任务状态
  async getJobStatus(jobId: string, userId: string | undefined) {
    // 开发测试：如果未登录，使用数据库中的第一个用户
    const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
    const job = await this.prisma.imageJob.findFirst({
      where: { id: jobId, userId: effectiveUserId },
    });
    if (!job) throw new NotFoundException('任务不存在');
    return job;
  }

  // 获取用户的任务历史
  async getUserJobs(userId: string | undefined, params: { page?: number; pageSize?: number }) {
    // 开发测试：如果未登录，使用数据库中的第一个用户
    const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
    const { page = 1, pageSize = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.imageJob.findMany({
        where: { userId: effectiveUserId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.imageJob.count({ where: { userId: effectiveUserId } }),
    ]);
    return { items, total, page, pageSize };
  }

  // 异步处理图片生成任务
  private async processImageJob(
    jobId: string,
    prompt: string,
    negativePrompt?: string,
    referenceImageUrl?: string,
  ) {
    try {
      const result = await this.imageGenProvider.generateImage(prompt, {
        negativePrompt,
        referenceImageUrl,
      });
      await this.prisma.imageJob.update({
        where: { id: jobId },
        data: {
          status: result.status,
          resultImageUrl: result.imageUrl,
          errorMsg: result.error,
        },
      });
    } catch (error: any) {
      await this.prisma.imageJob.update({
        where: { id: jobId },
        data: { status: 'failed', errorMsg: error.message || '图片生成失败' },
      });
    }
  }

  // 王者角色描述映射
  private getCharacterDescription(name: string): string {
    const map: Record<string, string> = {
      李白:
        'Ancient Chinese poet swordsman, white robes, flowing hair, holding a wine cup and sword',
      貂蝉:
        'Elegant dancer in flowing hanfu, cherry blossom petals, graceful pose',
      孙悟空:
        'Monkey King with golden armor, phoenix feather cap, wielding Ruyi Jingu Bang',
      韩信:
        'Military general with spear, silver armor, war hero pose, epic battlefield',
      赵云:
        'Dragon warrior in white armor, long spear, heroic stance, wind flowing cape',
      妲己:
        'Enchanting fox spirit, pink fox ears, seductive pose, magical aura',
    };
    return map[name] || `Chinese game character ${name}, epic fantasy style`;
  }
}
