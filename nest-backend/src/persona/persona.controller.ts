import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PersonaService } from './persona.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
// 创建角色人设 DTO
class CreatePersonaDto {
  @IsString()
  @IsNotEmpty({ message: '角色名称不能为空' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty({ message: '系统提示词不能为空' })
  systemPrompt: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

// 更新角色人设 DTO
class UpdatePersonaDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

// 角色人设控制器 - 管理角色人设的增删查改请求
@Controller('personas')
@UseGuards(JwtAuthGuard)
export class PersonaController {
  constructor(private readonly personaService: PersonaService) {}

  // 获取所有角色人设
  @Get()
  async getPersonas() {
    return this.personaService.getPersonas();
  }

  // 获取单个角色人设
  @Get(':id')
  async getPersona(@Param('id', ParseUUIDPipe) id: string) {
    return this.personaService.getPersonaById(id);
  }

  // 创建角色人设
  @Post()
  async createPersona(@Body() dto: CreatePersonaDto) {
    return this.personaService.createPersona(dto);
  }

  // 更新角色人设
  @Put(':id')
  async updatePersona(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePersonaDto,
  ) {
    return this.personaService.updatePersona(id, dto);
  }

  // 删除角色人设
  @Delete(':id')
  async deletePersona(@Param('id', ParseUUIDPipe) id: string) {
    return this.personaService.deletePersona(id);
  }
}
