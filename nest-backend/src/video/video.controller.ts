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
    return this.videoService.createJob(user.id, {
      prompt: dto.prompt,
      inputImageUrl: dto.inputImageUrl,
      resolution: dto.resolution,
      negativePrompt: dto.negativePrompt,
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
    return this.videoService.getUserJobs(user.id, p, ps);
  }
}
