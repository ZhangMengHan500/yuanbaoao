import { ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
export declare class MatchPasswordConstraint implements ValidatorConstraintInterface {
    validate(confirmPassword: string, args: ValidationArguments): boolean;
    defaultMessage(args: ValidationArguments): string;
}
export declare class RegisterDto {
    email: string;
    username?: string;
    password: string;
    confirmPassword: string;
}
