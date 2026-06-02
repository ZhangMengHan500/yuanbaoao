import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { DocReaderController } from './controllers/doc-reader.controller';
import { DocService } from './services/doc.service';
import { DocChunkerService } from './services/doc-chunker.service';
import { DocEmbeddingService } from './services/doc-embedding.service';
import { DocQAService } from './services/doc-qa.service';
import { DocSummaryService } from './services/doc-summary.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmModule } from '../llm/llm.module';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

@Module({
  imports: [
    PrismaModule,
    LlmModule,
    MulterModule.register({
      dest: './uploads/doc-reader',
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
    }),
  ],
  controllers: [DocReaderController],
  providers: [
    DocService,
    DocChunkerService,
    DocEmbeddingService,
    DocQAService,
    DocSummaryService,
  ],
  exports: [DocService],
})
export class DocReaderModule {}
