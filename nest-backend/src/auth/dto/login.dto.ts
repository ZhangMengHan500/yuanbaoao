import { IsEmail, IsString, MinLength } from 'class-validator';

// 登录 DTO - 用户登录时的请求体验证
export class LoginDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @IsString()
  @MinLength(1, { message: '密码不能为空' })
  password: string;
}
