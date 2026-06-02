import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  Matches,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

// 自定义验证器：校验确认密码是否与密码一致
@ValidatorConstraint({ name: 'MatchPassword', async: false })
export class MatchPasswordConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    return confirmPassword === relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    return '两次输入的密码不一致';
  }
}

// 注册 DTO - 用户注册时的请求体验证
export class RegisterDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  // 用户名可选，不传时后端自动从邮箱前缀生成
  @IsOptional()
  @IsString()
  @MinLength(2, { message: '用户名至少2个字符' })
  username?: string;

  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  password: string;

  // 确认密码必须与密码一致
  @IsString()
  @MinLength(6, { message: '确认密码至少6个字符' })
  @Matches(/^(?=.*[a-zA-Z\d]).{6,}$/, { message: '密码只能包含字母和数字' })
  @Validate(MatchPasswordConstraint, ['password'])
  confirmPassword: string;
}
