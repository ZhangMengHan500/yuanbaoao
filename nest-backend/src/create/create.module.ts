import { Module } from '@nestjs/common';
import { CreateController } from './create.controller';
import { CreateService } from './create.service';
import { Img2ImgController } from './img2img.controller';
import { Img2ImgService } from './img2img.service';
import { SiliconFlowProvider } from './siliconflow.provider';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmModule } from '../llm/llm.module';

// 创作模块 - AI 图片生成功能
@Module({
  imports: [PrismaModule, LlmModule],
  controllers: [CreateController, Img2ImgController],
  providers: [
    CreateService,
    Img2ImgService,
    { provide: 'IMAGE_GEN_PROVIDER', useClass: SiliconFlowProvider },
  ],
  exports: [CreateService, Img2ImgService],
})
export class CreateModule {}
