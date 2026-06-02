import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './session.controller';

// 会话服务 - 处理聊天会话的增删查操作
@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  // 获取用户的所有会话列表（按更新时间倒序）
  // 包含 persona 信息，方便前端展示每个会话绑定的角色
  async getSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        persona: true,  // 关联查询角色人设表
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  // 创建新会话
  async createSession(userId: string, dto: CreateSessionDto) {
    return this.prisma.session.create({
      data: {
        userId,
        title: dto.title || 'New Chat',
        personaId: dto.personaId,
      },
      include: {
        persona: true,  // 返回时包含 persona 数据
      },
    });
  }

  // 获取单个会话详情（含消息和角色信息）
  async getSessionById(sessionId: string, userId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      include: {
        persona: true,  // 包含角色信息
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    return session;
  }

  // 更新会话标题
  async updateSessionTitle(sessionId: string, userId: string, title: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    return this.prisma.session.update({
      where: { id: sessionId },
      data: { title },
    });
  }

  // 更新会话绑定的角色
  async updateSessionPersona(sessionId: string, userId: string, personaId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    // 检查persona是否存在
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
    });
    if (!persona) {
      throw new NotFoundException('角色人设不存在');
    }

    return this.prisma.session.update({
      where: { id: sessionId },
      data: { personaId },
      include: { persona: true },
    });
  }

  // 删除会话
  async deleteSession(sessionId: string, userId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    await this.prisma.session.delete({
      where: { id: sessionId },
    });

    return { deleted: true };
  }
}
