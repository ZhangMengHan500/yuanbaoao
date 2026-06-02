import { IsString, IsNotEmpty } from 'class-validator';

export class QARequestDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}
