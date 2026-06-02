import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { json, urlencoded } from 'express';

// 应用程序启动入口
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 启用 CORS 跨域（必须在静态文件之前）
  app.enableCors({
    origin: true, // 允许所有来源（开发环境）
    credentials: true,
  });

  // 增加请求体大小限制（支持大图片上传）
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // 确保上传目录存在
  const uploadDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  // 提供上传文件的静态访问
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  // 全局验证管道 - 自动验证和转换请求体
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动过滤非 DTO 定义的字段
      transform: true, // 自动转换类型
    }),
  );

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 全局响应转换拦截器
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`应用程序已启动，端口: ${port}`);
}

bootstrap();
