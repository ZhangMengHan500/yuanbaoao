import { IsString, IsOptional } from 'class-validator';

export class UploadDocDto {
  @IsString()
  @IsOptional()
  title?: string;
}
