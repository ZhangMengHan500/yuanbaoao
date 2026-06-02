import { Module } from '@nestjs/common';
import { SmartEditController } from './smart-edit.controller';
import { SmartEditService } from './smart-edit.service';
import { SiliconFlowProvider } from './siliconflow.provider';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [PrismaModule, LlmModule],
  controllers: [SmartEditController],
  providers: [
    SmartEditService,
    { provide: 'IMAGE_GEN_PROVIDER', useClass: SiliconFlowProvider },
  ],
  exports: [SmartEditService],
})
export class SmartEditModule {}
