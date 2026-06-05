import {
  Controller,
  Post,
  Get,
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
import { SmartEditService } from './smart-edit.service';
import { Observable, interval, switchMap, takeWhile } from 'rxjs';
import { Request } from 'express';

@Controller('create/smart-edit')
@UseGuards(JwtAuthGuard)
export class SmartEditController {
  constructor(private readonly smartEditService: SmartEditService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image', {
    limits: {
      fileSize: 10 * 1024 * 1024,
      fieldSize: 10 * 1024 * 1024,
    },
  }))
  async submitJob(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const body = req.body || {};
    const tool = body.tool || 'enhance';
    const prompt = body.prompt;
    const imageUrl = body.imageUrl;
    const ratio = body.ratio;

    console.log('[SmartEdit] received:', {
      tool,
      imageUrl,
      prompt: prompt?.substring(0, 40),
      ratio,
      hasFile: !!file,
      bodyKeys: Object.keys(body),
    });

    return this.smartEditService.submitJob(userId, {
      imageBuffer: file?.buffer,
      imageUrl,
      filename: file?.originalname || 'reference.png',
      tool,
      prompt,
      ratio,
    });
  }

  @Get('progress/:jobId')
  @Sse()
  getProgress(@Param('jobId') jobId: string): Observable<any> {
    return interval(500).pipe(
      switchMap(async () => {
        const progress = await this.smartEditService.getProgress(jobId);
        return progress || { step: 0, totalSteps: 30, percent: 0, status: 'pending' };
      }),
      takeWhile(progress => {
        const status = progress.status;
        return status === 'processing' || status === 'pending';
      }, true),
    );
  }

  @Get('job/:jobId')
  async getJobStatus(
    @Param('jobId') jobId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.smartEditService.getJobStatus(jobId, userId);
  }
}
