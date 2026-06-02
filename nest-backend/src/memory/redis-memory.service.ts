/**
 * 方案二：Redis 缓存记忆
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  原理：                                                     ║
 * ║  使用 Redis 的 List 数据结构存储对话消息。                   ║
 * ║  每个会话对应一个 Redis key:                                ║
 * ║    chat:memory:{sessionId} -> [msg1, msg2, ...]            ║
 * ║  每条消息序列化为 JSON 字符串后 LPUSH 到 List 中。          ║
 * ║  支持 TTL 自动过期（默认 24 小时），防止 Redis 内存爆满。   ║
 * ║                                                             ║
 * ║  优点：                                                     ║
 * ║  - 读写速度极快（~0.1ms 级别）                             ║
 * ║  - 进程重启不丢数据（数据在 Redis 服务端）                 ║
 * ║  - 支持 TTL 自动清理，不需要手动管理                       ║
 * ║  - 多实例部署可共享记忆（所有实例连同一个 Redis）          ║
 * ║                                                             ║
 * ║  缺点：                                                     ║
 * ║  - 依赖 Redis 服务                                         ║
 * ║  - 数据不是永久的，TTL 到期后自动删除                      ║
 * ║  - Redis 内存有限，不适合存储超大量历史                    ║
 * ║                                                             ║
 * ║  适用场景：线上多实例部署、需要快速响应的聊天场景、         ║
 * ║            会话有效期可控的客服/临时对话系统                ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * 技术栈：ioredis（项目已安装）作为 Redis 客户端
 * 数据格式：每条消息 JSON 序列化后存入 Redis List
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { IMemoryService, MemoryMessage } from './memory.interface';

@Injectable()
export class RedisMemoryService implements IMemoryService, OnModuleDestroy {
  private redis: Redis;                    // Redis 客户端实例
  private readonly keyPrefix = 'chat:memory:';  // key 前缀，防止和其他业务 key 冲突
  private readonly ttlSeconds = 86400;     // 过期时间：86400秒 = 24小时

  constructor(private configService: ConfigService) {
    // 从环境变量读取 Redis 连接地址，默认 localhost:6379
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: this.configService.get<number>('REDIS_PORT') || 6379,
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      db: this.configService.get<number>('REDIS_DB') || 0,
      maxRetriesPerRequest: 3,   // 最多重试 3 次
      lazyConnect: true,         // 延迟连接，避免启动时阻塞
    });

    // 建立连接（lazyConnect 模式下需要手动 connect）
    this.redis.connect().catch((err) => {
      console.error('[RedisMemory] Redis 连接失败:', err.message);
    });
  }

  /**
   * 模块销毁时关闭 Redis 连接（优雅退出）
   */
  async onModuleDestroy() {
    await this.redis.quit();
  }

  /**
   * 获取某个会话的历史消息
   * @param sessionId 会话ID
   * @param maxMessages 最多返回几条
   *
   * Redis 命令：LRANGE key 0 -1  →  返回 List 中所有元素
   * 然后在内存中取最后 maxMessages 条
   */
  async getHistory(sessionId: string, maxMessages: number = 20): Promise<MemoryMessage[]> {
    const key = this.getKey(sessionId);

    try {
      // LRANGE 获取 List 中的所有元素（0 到 -1 表示全部）
      const rawList = await this.redis.lrange(key, 0, -1);

      if (rawList.length === 0) {
        return []; // 没有历史记录
      }

      // 将 JSON 字符串反序列化为 MemoryMessage 对象
      const messages: MemoryMessage[] = rawList
        .map((raw) => {
          try {
            return JSON.parse(raw) as MemoryMessage;
          } catch {
            return null; // 跳过损坏的数据
          }
        })
        .filter((m): m is MemoryMessage => m !== null);

      // 只返回最近的 maxMessages 条
      // 注意：Redis List 是左进（LPUSH），所以最新的在最前面
      // 我们需要反转后取最后 maxMessages 条，再反转回来保持时间顺序
      return messages.slice(-maxMessages);
    } catch (err) {
      console.error('[RedisMemory] 读取历史失败:', err);
      return []; // Redis 不可用时降级为空（不阻塞聊天）
    }
  }

  /**
   * 保存一条消息到 Redis
   * @param sessionId 会话ID
   * @param message 要保存的消息
   *
   * Redis 命令：RPUSH key value  →  追加到 List 末尾（保持时间顺序）
   * 然后 EXPIRE key ttl  →  设置过期时间（每次写入都刷新 TTL）
   */
  async saveMessage(sessionId: string, message: MemoryMessage): Promise<void> {
    const key = this.getKey(sessionId);

    try {
      // 序列化为 JSON 字符串
      const serialized = JSON.stringify(message);

      // RPUSH 追加到 List 末尾（保持消息时间顺序）
      await this.redis.rpush(key, serialized);

      // 每次写入都刷新 TTL（滑动过期策略）
      // 这样只要用户持续聊天，记忆就不会过期
      // 只有停止聊天超过 24 小时，记忆才会被自动清理
      await this.redis.expire(key, this.ttlSeconds);
    } catch (err) {
      console.error('[RedisMemory] 保存消息失败:', err);
      // 保存失败不抛异常，不阻塞主流程
    }
  }

  /**
   * 清空某个会话的记忆
   * @param sessionId 会话ID
   *
   * Redis 命令：DEL key  →  删除整个 List
   */
  async clearHistory(sessionId: string): Promise<void> {
    const key = this.getKey(sessionId);
    try {
      await this.redis.del(key);
    } catch (err) {
      console.error('[RedisMemory] 清空历史失败:', err);
    }
  }

  /**
   * 返回记忆类型标识
   */
  getMemoryType(): string {
    return 'redis-memory'; // Redis 缓存模式
  }

  /**
   * 生成 Redis key
   * 格式：chat:memory:{sessionId}
   * 加前缀是为了：
   *   1. 防止和项目中其他 Redis key 冲突
   *   2. 方便在 Redis 中按前缀搜索/批量管理
   */
  private getKey(sessionId: string): string {
    return `${this.keyPrefix}${sessionId}`;
  }

  /**
   * 获取某个会话的记忆条数（调试/监控用）
   */
  async getMessageCount(sessionId: string): Promise<number> {
    const key = this.getKey(sessionId);
    return this.redis.llen(key);
  }
}
