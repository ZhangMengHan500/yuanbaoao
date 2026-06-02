import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// 消息服务 - 处理消息的查询和保存
@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  // 获取指定会话的所有消息（按创建时间正序）
  async getMessagesBySession(sessionId: string) {
    return this.prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // 保存消息
  async createMessage(sessionId: string, role: string, content: string, imageUrl?: string) {
    return this.prisma.message.create({
      data: {
        sessionId,
        role,
        content,
        ...(imageUrl ? { imageUrl } : {}),
      },
    });
  }

  // 获取会话的最近 N 条消息（用于上下文管理）
  async getRecentMessages(sessionId: string, limit: number = 20) {
    return this.prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }
}
