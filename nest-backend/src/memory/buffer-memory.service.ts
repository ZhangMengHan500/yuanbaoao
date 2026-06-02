/**
 * 方案一：内存缓冲记忆（ConversationBufferMemory）
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  原理：                                                     ║
 * ║  使用 Map<string, MemoryMessage[]> 在进程内存中保存对话。    ║
 * ║  每个 sessionId 对应一个消息数组，程序重启后全部清空。       ║
 * ║                                                             ║
 * ║  优点：                                                     ║
 * ║  - 零依赖，启动即用，速度最快                               ║
 * ║  - 适合本地开发、单元测试、演示环境                         ║
 * ║                                                             ║
 * ║  缺点：                                                     ║
 * ║  - 进程重启后所有记忆丢失                                   ║
 * ║  - 多实例部署时记忆不共享                                   ║
 * ║  - 内存有上限，大量会话会 OOM                               ║
 * ║                                                             ║
 * ║  适用场景：开发调试、原型验证、单机小规模部署               ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * LangChain 对应类：ConversationBufferMemory
 * 我们自己实现 IMemoryService 接口，内部用 Map 存储，
 * 同时兼容 LangChain 的 memory 格式，方便后续切换到其他方案。
 */

import { Injectable } from '@nestjs/common';
import { IMemoryService, MemoryMessage } from './memory.interface';

@Injectable()
export class BufferMemoryService implements IMemoryService {
  // 核心存储结构：sessionId -> 消息数组
  // 使用 Map 实现 O(1) 的读写速度
  private store: Map<string, MemoryMessage[]> = new Map();

  /**
   * 获取历史消息
   * @param sessionId 会话ID
   * @param maxMessages 最多返回几条，默认 20 条（防止上下文窗口溢出）
   */
  async getHistory(sessionId: string, maxMessages: number = 20): Promise<MemoryMessage[]> {
    // 从 Map 中取出该会话的消息，不存在则返回空数组
    const messages = this.store.get(sessionId) || [];

    // 只返回最近的 maxMessages 条（从末尾截取）
    // 这样做的原因：大模型的上下文窗口有限（如 4K/8K/128K token）
    // 不能把所有历史都塞进去，需要截断
    return messages.slice(-maxMessages);
  }

  /**
   * 保存一条消息
   * @param sessionId 会话ID
   * @param message 要保存的消息
   */
  async saveMessage(sessionId: string, message: MemoryMessage): Promise<void> {
    // 如果该会话还没有消息数组，先创建一个空数组
    if (!this.store.has(sessionId)) {
      this.store.set(sessionId, []);
    }
    // 将消息追加到数组末尾
    this.store.get(sessionId)!.push(message);
  }

  /**
   * 清空某个会话的全部记忆
   * @param sessionId 会话ID
   */
  async clearHistory(sessionId: string): Promise<void> {
    // 直接从 Map 中删除该会话
    this.store.delete(sessionId);
  }

  /**
   * 返回记忆类型标识
   */
  getMemoryType(): string {
    return 'buffer-memory'; // 纯内存模式
  }

  /**
   * 获取当前内存中的会话数量（调试用）
   */
  getSessionCount(): number {
    return this.store.size;
  }
}
