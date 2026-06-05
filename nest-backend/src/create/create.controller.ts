import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { CreateService } from './create.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';

// ====== DTO 定义 ======

class AiGenDto {
  @IsOptional()
  @IsString()
  templateId?: string;

  @IsString()
  @IsNotEmpty({ message: '请输入图片描述' })
  userDescription: string;

  @IsOptional()
  @IsString()
  aspectRatio?: string;

  @IsOptional()
  @IsString()
  negativePrompt?: string;

  @IsOptional()
  @IsString()
  referenceImageUrl?: string;
}

class AiEditDto {
  @IsString()
  @IsNotEmpty({ message: '请输入编辑指令' })
  editInstruction: string;

  @IsString()
  @IsNotEmpty({ message: '请上传参考图片' })
  referenceImageUrl: string;
}

class CosDto {
  @IsString()
  @IsNotEmpty({ message: '请选择角色' })
  characterName: string;

  @IsString()
  @IsNotEmpty({ message: '请上传照片' })
  referenceImageUrl: string;
}

// 创作控制器 - AI 图片生成相关端点
@Controller('create')
export class CreateController {
  constructor(private readonly createService: CreateService) {}

  // ====== 公开接口（无需登录即可浏览模板） ======

  // GET /create/templates - 获取模板列表（支持分类过滤 + 分页）
  @Get('templates')
  getTemplates(
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.createService.getTemplates({
      category,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
    });
  }

  // GET /create/templates/:id - 获取模板详情
  @Get('templates/:id')
  getTemplate(@Param('id') id: string) {
    return this.createService.getTemplate(id);
  }

  // GET /create/style-categories - 获取风格分类（含模板）
  @Get('style-categories')
  getStyleCategories() {
    return this.createService.getStyleCategories();
  }

  // GET /create/style-templates - 获取风格模板列表
  @Get('style-templates')
  getStyleTemplates(@Query('categoryId') categoryId?: string) {
    return this.createService.getStyleTemplates(categoryId);
  }

  // GET /create/cos/heroes - 获取英雄列表（从数据库）
  @Get('cos/heroes')
  getCosHeroes() {
    return this.createService.getCosHeroes();
  }

  // ====== 需要登录的接口 ======

  // POST /create/ai-gen - AI 生图
  @UseGuards(JwtAuthGuard)
  @Post('ai-gen')
  createAiGen(@Body() dto: AiGenDto, @CurrentUser('id') userId: string) {
    return this.createService.createAiGenJob(userId, dto);
  }

  // POST /create/ai-edit - 智能 P 图
  @UseGuards(JwtAuthGuard)
  @Post('ai-edit')
  createAiEdit(@Body() dto: AiEditDto, @CurrentUser('id') userId: string) {
    return this.createService.createEditJob(userId, dto);
  }

  // POST /create/cos - 王者 COS
  @UseGuards(JwtAuthGuard)
  @Post('cos')
  createCos(@Body() dto: CosDto, @CurrentUser('id') userId: string) {
    return this.createService.createCosJob(userId, dto);
  }

  // POST /create/cos/seed - 初始化英雄数据 + 生成预览图
  @UseGuards(JwtAuthGuard)
  @Post('cos/seed')
  seedCosHeroes() {
    return this.createService.seedCosHeroes();
  }

  // GET /create/jobs/:id - 查询任务状态
  @UseGuards(JwtAuthGuard)
  @Get('jobs/:id')
  getJobStatus(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.createService.getJobStatus(id, userId);
  }

  // GET /create/jobs - 获取用户任务历史
  @UseGuards(JwtAuthGuard)
  @Get('jobs')
  getUserJobs(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.createService.getUserJobs(userId, {
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
    });
  }

  // POST /create/upload - 上传参考图片
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          cb(null, `${uuid()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|webp|gif)$/)) {
          cb(new Error('只支持 JPG/PNG/WEBP/GIF 格式'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    // 返回完整的HTTP URL
    const baseUrl = 'http://localhost:3000';
    return { url: `${baseUrl}/uploads/${file.filename}`, filename: file.filename };
  }
}
