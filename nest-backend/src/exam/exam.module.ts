import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [
    LlmModule,
    MulterModule.register({
      dest: './uploads/exam',
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  ],
  controllers: [ExamController],
  providers: [ExamService],
  exports: [ExamService],
})
export class ExamModule {}
