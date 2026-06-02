import { Module } from '@nestjs/common';
import { TranslateService } from './translate.service';
import { TranslateController } from './translate.controller';
import { TranslateGateway } from './translate.gateway';
import { LlmModule } from '../llm/llm.module';
import { RecordingModule } from '../recording/recording.module';

@Module({
  imports: [LlmModule, RecordingModule],
  controllers: [TranslateController],
  providers: [TranslateService, TranslateGateway],
  exports: [TranslateService],
})
export class TranslateModule {}
