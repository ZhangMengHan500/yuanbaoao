/**
 * 记忆工厂 - 根据环境变量自动选择记忆方案
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  使用方式：                                                 ║
 * ║  在 .env 文件中设置 MEMORY_TYPE 变量：                      ║
 * ║    MEMORY_TYPE=buffer   → 使用内存记忆（默认）             ║
 * ║    MEMORY_TYPE=redis    → 使用 Redis 记忆                  ║
 * ║    MEMORY_TYPE=postgres → 使用 PostgreSQL 记忆              ║
 * ║                                                             ║
 * ║  如果不设置，默认使用 buffer（内存记忆）                    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * 工厂模式的好处：
 *   - 调用方不需要关心具体用哪种记忆，只需要注入 IMemoryService
 *   - 切换记忆方案只需要改环境变量，不需要改代码
 *   - 方便做 A/B 测试和灰度切换
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMemoryService } from './memory.interface';
import { BufferMemoryService } from './buffer-memory.service';
import { RedisMemoryService } from './redis-memory.service';
import { PostgresMemoryService } from './postgres-memory.service';

@Injectable()
export class MemoryFactory {
  // 缓存已创建的记忆服务实例（单例模式）
  private memoryService: IMemoryService | null = null;

  constructor(
    private configService: ConfigService,
    private bufferMemory: BufferMemoryService,       // 注入内存记忆
    private redisMemory: RedisMemoryService,         // 注入 Redis 记忆
    private postgresMemory: PostgresMemoryService,   // 注入 PostgreSQL 记忆
  ) {}

  /**
   * 获取当前配置的记忆服务实例
   * 如果已经创建过，直接返回缓存的实例（单例）
   */
  getMemoryService(): IMemoryService {
    // 如果已经创建过，直接返回
    if (this.memoryService) {
      return this.memoryService;
    }

    // 从环境变量读取记忆类型
    const memoryType = this.configService.get<string>('MEMORY_TYPE') || 'buffer';

    // 根据配置选择对应的记忆服务
    switch (memoryType.toLowerCase()) {
      case 'redis':
        this.memoryService = this.redisMemory;
        console.log('[MemoryFactory] 使用 Redis 缓存记忆');
        break;

      case 'postgres':
      case 'postgresql':
        this.memoryService = this.postgresMemory;
        console.log('[MemoryFactory] 使用 PostgreSQL 持久化记忆');
        break;

      case 'buffer':
      default:
        this.memoryService = this.bufferMemory;
        console.log('[MemoryFactory] 使用内存缓冲记忆（重启清空）');
        break;
    }

    return this.memoryService;
  }

  /**
   * 获取当前记忆类型名称（用于 API 返回/日志）
   */
  getMemoryTypeName(): string {
    return this.getMemoryService().getMemoryType();
  }
}
