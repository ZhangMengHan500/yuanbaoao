import { Module } from '@nestjs/common';
import { RecordingModule } from '../recording/recording.module';
import { LlmModule } from '../llm/llm.module';
import { VoiceCallService } from './voice-call.service';
import { VoiceCallGateway } from './voice-call.gateway';
import { VoiceCallController } from './voice-call.controller';

@Module({
  imports: [RecordingModule, LlmModule],
  controllers: [VoiceCallController],
  providers: [VoiceCallService, VoiceCallGateway],
  exports: [VoiceCallGateway],
})
export class VoiceCallModule {}
