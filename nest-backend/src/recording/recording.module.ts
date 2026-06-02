import { Module } from '@nestjs/common';
import { RecordingController } from './recording.controller';
import { RecordingService } from './recording.service';
import { RecordingGateway } from './recording.gateway';

@Module({
  controllers: [RecordingController],
  providers: [RecordingService, RecordingGateway],
  exports: [RecordingGateway, RecordingService],
})
export class RecordingModule {}
