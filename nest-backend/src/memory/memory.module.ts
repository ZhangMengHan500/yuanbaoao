/**
 * 记忆模块 - NestJS 模块定义
 *
 * 这个模块把三种记忆服务 + 工厂注册到 NestJS 的依赖注入容器中。
 * 其他模块只需要 import MemoryModule 就可以注入 IMemoryService。
 *
 * 依赖：
 *   - PrismaModule    → PostgreSQL 记忆需要
 *   - ConfigModule    → 读取环境变量（MEMORY_TYPE、REDIS_HOST 等）
 */

import { Module } from '@nestjs/common';
import { BufferMemoryService } from './buffer-memory.service';
import { RedisMemoryService } from './redis-memory.service';
import { PostgresMemoryService } from './postgres-memory.service';
import { MemoryFactory } from './memory.factory';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],  // PostgreSQL 记忆依赖 Prisma
  providers: [
    BufferMemoryService,     // 方案一：内存记忆
    RedisMemoryService,      // 方案二：Redis 记忆
    PostgresMemoryService,   // 方案三：PostgreSQL 记忆
    MemoryFactory,           // 工厂：根据配置自动选择
  ],
  exports: [
    MemoryFactory,           // 导出工厂，供其他模块使用
    BufferMemoryService,     // 也导出各个具体实现（可选直接注入）
    RedisMemoryService,
    PostgresMemoryService,
  ],
})
export class MemoryModule {}
