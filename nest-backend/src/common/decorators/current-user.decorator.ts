import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// 自定义装饰器：从 JWT token 中提取当前用户信息
export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
