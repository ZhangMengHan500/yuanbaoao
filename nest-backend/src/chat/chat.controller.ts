import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  UseGuards,
  Res,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { readFileSync } from 'fs';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

// 聊天请求 DTO
class ChatStreamDto {
  @IsString()
  @IsNotEmpty({ message: '消息内容不能为空' })
  content: string;

  @IsString()
  @IsNotEmpty({ message: '会话ID不能为空' })
  sessionId: string;

  @IsOptional()
  @IsString()
  personaId?: string;

  @IsOptional()
  @IsBoolean()
  enableRag?: boolean;

  @IsOptional()
  @IsBoolean()
  deepThinking?: boolean;

  @IsOptional()
  @IsBoolean()
  webSearch?: boolean;
}

// 拍照答疑请求 DTO
class PhotoSolveDto {
  @IsString()
  @IsNotEmpty({ message: '消息内容不能为空' })
  content: string;

  @IsString()
  @IsNotEmpty({ message: '会话ID不能为空' })
  sessionId: string;

  @IsString()
  @IsNotEmpty({ message: '图片URL不能为空' })
  imageUrl: string;

  @IsOptional()
  @IsString()
  personaId?: string;
}

// 聊天控制器 - SSE 流式对话端点
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
  ) {}

  // POST SSE 流式聊天端点
  // 前端通过 fetch + ReadableStream 连接此端点
  @Post('stream')
  async streamChat(
    @Body() dto: ChatStreamDto,
    @Res() res: Response,
    @CurrentUser('id') userId: string,
  ) {
    // 开发测试：如果未登录，使用数据库中的第一个用户
    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // nginx 不缓冲
    res.flushHeaders();

    try {
      const { content, sessionId, personaId, enableRag = true, deepThinking = false, webSearch = false } = dto;

      // 1. 保存用户消息到数据库
      await this.chatService.saveUserMessage(sessionId, content);

      // 1.5 自动标题：如果会话标题还是默认的 "New Chat"，用第一条消息生成标题
      await this.chatService.autoTitleIfNew(sessionId, userId, content);

      // 2. 构建对话上下文（传入请求中的 personaId，优先使用前端选中的角色）
      const { messages } = await this.chatService.buildChatContext(
        sessionId,
        userId,
        content,
        enableRag,
        personaId,
        deepThinking,
        webSearch,
      );

      // 3. 添加当前用户消息
      messages.push({ role: 'user', content });

      // 4. 流式调用 LLM 并通过 SSE 推送每个 token
      let fullResponse = '';

      for await (const token of this.chatService.streamReply(messages)) {
        fullResponse += token;
        // SSE 格式：data: {json}\n\n
        res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
      }

      // 5. 流式完成后保存助手消息到数据库
      if (fullResponse) {
        await this.chatService.saveAssistantMessage(sessionId, fullResponse);
      }

      // 6. 发送完成信号
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error('流式聊天错误:', error);
      // 发送错误信号
      res.write(
        `data: ${JSON.stringify({ error: error.message || '处理请求时出错' })}\n\n`,
      );
      res.end();
    }
  }

  // GET /chat/memory-type - 获取当前使用的记忆类型
  @Get('memory-type')
  getMemoryType() {
    return {
      type: this.chatService.getMemoryType(),
    };
  }

  // POST /chat/photo-solve - 拍照答疑（Vision 多模态流式）
  @Post('photo-solve')
  @HttpCode(200)
  async photoSolve(
    @Body() dto: PhotoSolveDto,
    @Res() res: Response,
    @CurrentUser('id') userId: string,
  ) {
    // 开发测试：如果未登录，使用数据库中的第一个用户
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const { content, sessionId, imageUrl, personaId } = dto;
      console.log('[PhotoSolve] 收到请求, imageUrl:', imageUrl?.substring(0, 80));

      // 1. 保存带图片的用户消息
      await this.chatService.saveUserMessageWithImage(sessionId, content, imageUrl);

      // 2. 自动生成标题
      await this.chatService.autoTitleIfNew(sessionId, userId, '拍题答疑');

      // 3. 构建对话上下文（文本历史）
      const context = await this.chatService.buildChatContext(
        sessionId,
        userId,
        content,
        false, // 拍题不需要 RAG
        personaId,
      );
      const messages: any[] = context.messages;

      // 4. 注入拍照答疑系统提示词（强制 Markdown 格式输出）
      messages.push({
        role: 'system',
        content: `你是专业全学科AI解题大师。请使用 Markdown 格式回答，包括：
- 标题用 ## 和 ###
- 重点内容用 **加粗**
- 步骤用有序列表 1. 2. 3.
- 代码或公式用反引号包裹
- 适当使用分隔线 ---

回答结构：
## 题目解析
## 标准答案
## 详细步骤
## 知识点总结
## 易错提醒

请确保解答准确、步骤清晰、语言通俗易懂。`,
      });

      // 5. 将图片转为 base64 data URL（本地文件 LLM 无法直接访问）
      let imageDataUrl = imageUrl;
      const uploadsMatch = imageUrl.match(/\/uploads\/.+/);
      if (uploadsMatch) {
        const filePath = join(process.cwd(), uploadsMatch[0]);
        const buf = readFileSync(filePath);
        const ext = uploadsMatch[0].split('.').pop() || 'jpg';
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        imageDataUrl = `data:${mime};base64,${buf.toString('base64')}`;
        console.log('[PhotoSolve] 图片已转为 data URL, 长度:', imageDataUrl.length);
      }

      // 6. 添加包含图片的多模态用户消息
      messages.push({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageDataUrl } },
          { type: 'text', text: content || '请解答这道题目' },
        ],
      });

      // 7. 流式调用 DashScope 视觉模型
      console.log('[PhotoSolve] 开始调用视觉模型...');
      let fullResponse = '';
      for await (const token of this.chatService.streamPhotoSolve(messages)) {
        fullResponse += token;
        res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
      }

      // 8. 保存助手回复
      if (fullResponse) {
        await this.chatService.saveAssistantMessage(sessionId, fullResponse);
      }

      // 9. 完成信号
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error('拍照答疑错误:', error);
      res.write(
        `data: ${JSON.stringify({ error: error.message || '处理请求时出错' })}\n\n`,
      );
      res.end();
    }
  }

  // DELETE /chat/memory/:sessionId - 清空某个会话的记忆
  @Delete('memory/:sessionId')
  async clearMemory(@Param('sessionId') sessionId: string) {
    await this.chatService.clearSessionMemory(sessionId);
    return { message: '记忆已清空' };
  }
}
