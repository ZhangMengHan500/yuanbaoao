import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { SiliconFlowVideo } from './siliconflow-video';
import { VideoProgressGateway } from './video.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VideoController],
  providers: [VideoService, SiliconFlowVideo, VideoProgressGateway],
  exports: [VideoService],
})
export class VideoModule {}
