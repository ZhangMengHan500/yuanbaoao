import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { IsString, IsNotEmpty } from 'class-validator';

// 创建消息 DTO
class CreateMessageDto {
  @IsString()
  @IsNotEmpty({ message: '会话ID不能为空' })
  sessionId: string;

  @IsString()
  @IsNotEmpty({ message: '角色不能为空' })
  role: string; // "user" | "assistant" | "system"

  @IsString()
  @IsNotEmpty({ message: '消息内容不能为空' })
  content: string;
}

// 消息控制器 - 处理消息的查询和保存请求
@Controller('messages')
@UseGuards(JwtAuthGuard)
@Public() // 临时禁用认证，方便开发测试
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  // 获取指定会话的所有消息
  @Get(':sessionId')
  async getMessages(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.messageService.getMessagesBySession(sessionId);
  }

  // 保存消息
  @Post()
  async createMessage(@Body() dto: CreateMessageDto) {
    return this.messageService.createMessage(dto.sessionId, dto.role, dto.content);
  }
}
