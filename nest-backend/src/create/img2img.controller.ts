import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Sse,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Img2ImgService } from './img2img.service';
import { Observable, interval, switchMap, takeWhile } from 'rxjs';
import { Request } from 'express';

@Controller('create/img2img')
@UseGuards(JwtAuthGuard)
export class Img2ImgController {
  constructor(private readonly img2imgService: Img2ImgService) {}

  // POST /create/img2img — 提交图生图任务
  @Post()
  @UseInterceptors(FileInterceptor('image', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      fieldSize: 10 * 1024 * 1024, // 10MB for base64 data URI fields
    },
  }))
  async submitJob(
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
    @CurrentUser('id') userId?: string,
  ) {
    // 开发测试：如果未登录，使用数据库中的第一个用户
    // 从 multer 解析的 body 中读取字段
    const body = req.body || {};
    const prompt = body.prompt;
    const imageUrl = body.imageUrl;
    const negativePrompt = body.negativePrompt;
    const strength = body.strength;
    const templateId = body.templateId;

    console.log('[Img2Img] received:', {
      imageUrl,
      prompt: prompt?.substring(0, 40),
      hasFile: !!file,
      bodyKeys: Object.keys(body),
      templateId,
    });

    return this.img2imgService.submitJob(userId, {
      imageBuffer: file?.buffer,
      imageUrl,
      filename: file?.originalname || 'reference.png',
      prompt,
      negativePrompt,
      strength: strength ? parseFloat(strength) : 0.75,
      templateId,
    });
  }

  // POST /create/img2img/generate-prompt — 根据模板生成提示词（LangChain）
  @Post('generate-prompt')
  async generatePrompt(
    @Body('templateId') templateId: string,
    @Body('referenceDescription') referenceDescription?: string,
  ) {
    return this.img2imgService.generatePrompt(templateId, referenceDescription);
  }

  // GET /create/img2img/progress/:jobId — SSE 流式推送进度
  @Get('progress/:jobId')
  @Sse()
  getProgress(@Param('jobId') jobId: string): Observable<any> {
    return interval(500).pipe(
      switchMap(async () => {
        const progress = await this.img2imgService.getProgress(jobId);
        return progress || { step: 0, totalSteps: 30, percent: 0, status: 'pending' };
      }),
      takeWhile(progress => {
        const status = progress.status;
        return status === 'processing' || status === 'pending';
      }, true),
    );
  }

  // GET /create/img2img/job/:jobId — 查询任务状态
  @Get('job/:jobId')
  async getJobStatus(
    @Param('jobId') jobId: string,
    @CurrentUser('id') userId?: string,
  ) {
    // 开发测试：如果未登录，使用数据库中的第一个用户
    return this.img2imgService.getJobStatus(jobId, userId);
  }
}
