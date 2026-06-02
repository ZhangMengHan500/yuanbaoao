import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// 角色人设服务 - 管理 AI 角色人设的增删查改
@Injectable()
export class PersonaService {
  constructor(private prisma: PrismaService) {}

  // 获取所有角色人设
  async getPersonas() {
    return this.prisma.persona.findMany({
      orderBy: { isDefault: 'desc' }, // 默认角色排在前面
    });
  }

  // 获取单个角色人设
  async getPersonaById(id: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { id },
    });

    if (!persona) {
      throw new NotFoundException('角色人设不存在');
    }

    return persona;
  }

  // 创建角色人设
  async createPersona(data: {
    name: string;
    description?: string;
    systemPrompt: string;
    avatar?: string;
    isDefault?: boolean;
  }) {
    return this.prisma.persona.create({
      data,
    });
  }

  // 更新角色人设
  async updatePersona(
    id: string,
    data: {
      name?: string;
      description?: string;
      systemPrompt?: string;
      avatar?: string;
      isDefault?: boolean;
    },
  ) {
    const persona = await this.prisma.persona.findUnique({
      where: { id },
    });

    if (!persona) {
      throw new NotFoundException('角色人设不存在');
    }

    return this.prisma.persona.update({
      where: { id },
      data,
    });
  }

  // 删除角色人设
  async deletePersona(id: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { id },
    });

    if (!persona) {
      throw new NotFoundException('角色人设不存在');
    }

    await this.prisma.persona.delete({
      where: { id },
    });

    return { deleted: true };
  }
}
