import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Prisma 全局模块，其他模块可以直接使用 PrismaService
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
