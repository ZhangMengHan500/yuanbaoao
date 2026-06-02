/**
 * LangChain 记忆系统 - 统一接口定义
 *
 * 三种记忆方案共享同一个接口，方便通过工厂模式切换：
 *   1. BufferMemory   - 纯内存，重启即丢失，适合开发调试
 *   2. RedisMemory    - Redis 缓存，重启不丢但有 TTL，适合会话级记忆
 *   3. PostgresMemory - PostgreSQL 持久化，永久保存，适合长期记忆
 */

// 单条消息的结构
export interface MemoryMessage {
  role: 'user' | 'assistant' | 'system'; // 消息角色
  content: string;                        // 消息内容
}

// 记忆服务统一接口
export interface IMemoryService {
  /**
   * 获取某个会话的历史消息
   * @param sessionId 会话ID
   * @param maxMessages 最多返回几条（防止上下文过长）
   * @returns 消息列表
   */
  getHistory(sessionId: string, maxMessages?: number): Promise<MemoryMessage[]>;

  /**
   * 保存一条消息到记忆
   * @param sessionId 会话ID
   * @param message 消息内容
   */
  saveMessage(sessionId: string, message: MemoryMessage): Promise<void>;

  /**
   * 清空某个会话的记忆
   * @param sessionId 会话ID
   */
  clearHistory(sessionId: string): Promise<void>;

  /**
   * 获取记忆类型名称（用于日志/调试）
   */
  getMemoryType(): string;
}
