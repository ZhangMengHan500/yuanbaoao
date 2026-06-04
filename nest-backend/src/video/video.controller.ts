import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VideoService } from './video.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

class GenerateVideoDto {
  @IsString()
  @IsNotEmpty({ message: '请输入视频描述' })
  prompt: string;

  @IsOptional()
  @IsString()
  inputImageUrl?: string;

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsOptional()
  @IsString()
  negativePrompt?: string;

  @IsOptional()
  numFrames?: number;

  @IsOptional()
  fps?: number;

  @IsOptional()
  motionStrength?: number;
}

@Controller('video')
@UseGuards(JwtAuthGuard)
@Public() // 临时禁用认证，方便开发测试
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  /**
   * 提交视频生成任务
   */
  @Post('generate')
  async generate(
    @CurrentUser() user: any,
    @Body() dto: GenerateVideoDto,
  ) {
    // 处理未登录用户
    const userId = user?.id || 'a3dfb476-937a-4303-808c-316b512c2514';
    return this.videoService.createJob(userId, {
      prompt: dto.prompt,
      inputImageUrl: dto.inputImageUrl,
      resolution: dto.resolution,
      negativePrompt: dto.negativePrompt,
      numFrames: dto.numFrames,
      fps: dto.fps,
      motionStrength: dto.motionStrength,
    });
  }

  /**
   * 查询任务状态
   */
  @Get('jobs/:id')
  async getJob(@Param('id') id: string) {
    return this.videoService.getJob(id);
  }

  /**
   * 获取用户任务列表
   */
  @Get('jobs')
  async getUserJobs(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const ps = pageSize ? parseInt(pageSize, 10) : 20;
    // 处理未登录用户
    const userId = user?.id || 'a3dfb476-937a-4303-808c-316b512c2514';
    return this.videoService.getUserJobs(userId, p, ps);
  }
}
