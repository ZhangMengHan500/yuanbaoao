import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// SSE 路由列表 - 这些路由需要流式响应，跳过格式包装
const SSE_ROUTES = ['/chat/stream', '/chat/photo-solve', '/homework/grade', '/recording/process', '/writing/generate', '/doc-reader/conversations', '/translate/stream', '/translate/photo'];

// 统一响应格式拦截器 - 将所有响应包装为 { success, data } 格式
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    // SSE 路由跳过包装，直接返回流式响应
    if (SSE_ROUTES.some(route => req.url?.startsWith(route))) {
      return next.handle();
    }
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
      })),
    );
  }
}
