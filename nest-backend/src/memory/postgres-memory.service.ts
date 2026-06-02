/**
 * 方案三：PostgreSQL 长期数据库记忆
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  原理：                                                     ║
 * ║  利用项目已有的 Prisma ORM + PostgreSQL 存储对话消息。      ║
 * ║  直接复用 Message 表（已有 id/sessionId/role/content 字段） ║
 * ║  不需要新建表，和现有业务数据完全融合。                     ║
 * ║                                                             ║
 * ║  优点：                                                     ║
 * ║  - 数据永久保存，不怕重启/宕机                             ║
 * ║  - 支持复杂查询（按时间范围、关键词搜索历史对话）          ║
 * ║  - 支持事务，数据一致性有保障                              ║
 * ║  - 可以关联用户/会话/角色等业务数据                        ║
 * ║  - 数据可迁移、可备份                                      ║
 * ║                                                             ║
 * ║  缺点：                                                     ║
 * ║  - 读写速度比 Redis 慢（~5-10ms 级别）                     ║
 * ║  - 需要维护数据库（磁盘空间、索引优化等）                  ║
 * ║  - 高并发场景需要考虑连接池和索引                          ║
 * ║                                                             ║
 * ║  适用场景：正式生产环境、需要长期记忆的 AI 助手、           ║
 * ║            需要对话审计/回溯的企业级应用                    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * 技术栈：Prisma（项目已安装） + PostgreSQL
 * 复用现有 Message 表，不需要额外建表
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IMemoryService, MemoryMessage } from './memory.interface';

@Injectable()
export class PostgresMemoryService implements IMemoryService {
  // 注入 PrismaService（项目已有的数据库服务）
  constructor(private prisma: PrismaService) {}

  /**
   * 获取某个会话的历史消息
   * @param sessionId 会话ID
   * @param maxMessages 最多返回几条
   *
   * SQL 等价：
   *   SELECT * FROM messages
   *   WHERE session_id = ?
   *   ORDER BY created_at DESC
   *   LIMIT ?
   *
   * 然后反转结果，保持时间正序（旧→新）
   */
  async getHistory(sessionId: string, maxMessages: number = 20): Promise<MemoryMessage[]> {
    // Prisma 查询：按创建时间倒序取 maxMessages 条
    const messages = await this.prisma.message.findMany({
      where: { sessionId },           // WHERE session_id = ?
      orderBy: { createdAt: 'desc' }, // ORDER BY created_at DESC
      take: maxMessages,              // LIMIT maxMessages
      select: {
        role: true,     // 只查 role 和 content 两个字段
        content: true,  // 不查其他字段，减少数据传输量
      },
    });

    // 数据库是倒序查的（最新的在前），反转为正序（旧→新）
    // 这样大模型看到的上下文是按时间顺序排列的
    return messages.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));
  }

  /**
   * 保存一条消息到 PostgreSQL
   * @param sessionId 会话ID
   * @param message 要保存的消息
   *
   * SQL 等价：
   *   INSERT INTO messages (id, session_id, role, content, created_at)
   *   VALUES (uuid(), ?, ?, ?, NOW())
   *
   * 注意：这里只保存到 Message 表
   * 如果你的业务已经通过 MessageService 保存了一次，可以跳过这步
   * 这里提供独立保存能力，是为了让 Memory 模块可以独立使用
   */
  async saveMessage(sessionId: string, message: MemoryMessage): Promise<void> {
    await this.prisma.message.create({
      data: {
        sessionId,                        // 关联到哪个会话
        role: message.role,               // user / assistant / system
        content: message.content,         // 消息正文
      },
    });
  }

  /**
   * 清空某个会话的全部记忆
   * @param sessionId 会话ID
   *
   * SQL 等价：
   *   DELETE FROM messages WHERE session_id = ?
   *
   * ⚠️ 警告：这是真删除！数据不可恢复！
   * 生产环境建议用软删除（加 deleted_at 字段）
   */
  async clearHistory(sessionId: string): Promise<void> {
    await this.prisma.message.deleteMany({
      where: { sessionId }, // WHERE session_id = ?
    });
  }

  /**
   * 返回记忆类型标识
   */
  getMemoryType(): string {
    return 'postgres-memory'; // PostgreSQL 持久化模式
  }

  /**
   * 按时间范围查询历史（扩展功能）
   * 只有数据库记忆才支持的高级查询
   *
   * @param sessionId 会话ID
   * @param from 起始时间
   * @param to 结束时间
   */
  async getHistoryByTimeRange(
    sessionId: string,
    from: Date,
    to: Date,
  ): Promise<MemoryMessage[]> {
    const messages = await this.prisma.message.findMany({
      where: {
        sessionId,
        createdAt: {
          gte: from,  // created_at >= from
          lte: to,    // created_at <= to
        },
      },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    });

    return messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));
  }

  /**
   * 关键词搜索历史消息（扩展功能）
   * 利用数据库的 LIKE 查询实现简单的全文搜索
   *
   * @param sessionId 会话ID
   * @param keyword 搜索关键词
   */
  async searchHistory(sessionId: string, keyword: string): Promise<MemoryMessage[]> {
    const messages = await this.prisma.message.findMany({
      where: {
        sessionId,
        content: {
          contains: keyword,  // WHERE content LIKE '%keyword%'
          mode: 'insensitive', // 忽略大小写
        },
      },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    });

    return messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));
  }
}
