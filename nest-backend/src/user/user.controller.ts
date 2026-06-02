import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { IsOptional, IsString } from 'class-validator';

// 更新用户 DTO
class UpdateUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}

// 用户控制器 - 处理用户信息相关请求
@Controller('user')
@UseGuards(JwtAuthGuard)
@Public() // 临时禁用认证，方便开发测试
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 获取当前用户信息
  @Get('profile')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.userService.getUserById(userId);
  }

  // 更新用户信息
  @Patch('profile')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.updateUser(userId, dto);
  }
}
