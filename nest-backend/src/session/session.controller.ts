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
import { Public } from '../common/decorators/public.decorator';
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
@Public() // 临时禁用认证，方便开发测试
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  // 获取当前用户的所有会话（含角色信息）
  @Get()
  async getSessions(@CurrentUser('id') userId?: string) {
    // 开发测试：如果未登录，使用数据库中的第一个用户
    const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
    return this.sessionService.getSessions(effectiveUserId);
  }

  // 获取单个会话详情（含消息和角色）
  @Get(':id')
  async getSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId?: string,
  ) {
    // 开发测试：如果未登录，使用数据库中的第一个用户
    const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
    return this.sessionService.getSessionById(id, effectiveUserId);
  }

  // 创建新会话
  @Post()
  async createSession(
    @CurrentUser('id') userId?: string,
    @Body() dto: CreateSessionDto = {},
  ) {
    // 开发测试：如果未登录，使用数据库中的第一个用户
    const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
    return this.sessionService.createSession(effectiveUserId, dto);
  }

  // 更新会话绑定的角色（切换角色人设）
  @Patch(':id/persona')
  async updateSessionPersona(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePersonaDto,
    @CurrentUser('id') userId?: string,
  ) {
    // 开发测试：如果未登录，使用数据库中的第一个用户
    const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
    return this.sessionService.updateSessionPersona(id, effectiveUserId, dto.personaId);
  }

  // 删除会话
  @Delete(':id')
  async deleteSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId?: string,
  ) {
    // 开发测试：如果未登录，使用数据库中的第一个用户
    const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
    return this.sessionService.deleteSession(id, effectiveUserId);
  }
}
