import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SessionService } from './session.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IsOptional, IsString } from 'class-validator';

// 创建会话 DTO
export class CreateSessionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  personaId?: string;
}

// 更新会话角色 DTO
export class UpdatePersonaDto {
  @IsString()
  personaId: string;
}

// 会话控制器 - 处理聊天会话的增删查请求
@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  // 获取当前用户的所有会话（含角色信息）
  @Get()
  async getSessions(@CurrentUser('id') userId: string) {
    return this.sessionService.getSessions(userId);
  }

  // 获取单个会话详情（含消息和角色）
  @Get(':id')
  async getSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.sessionService.getSessionById(id, userId);
  }

  // 创建新会话
  @Post()
  async createSession(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSessionDto = {},
  ) {
    return this.sessionService.createSession(userId, dto);
  }

  // 更新会话绑定的角色（切换角色人设）
  @Patch(':id/persona')
  async updateSessionPersona(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePersonaDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.sessionService.updateSessionPersona(id, userId, dto.personaId);
  }

  // 删除会话
  @Delete(':id')
  async deleteSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.sessionService.deleteSession(id, userId);
  }
}
