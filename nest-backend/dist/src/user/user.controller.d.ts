import { UserService } from './user.service';
declare class UpdateUserDto {
    username?: string;
    avatar?: string;
}
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    getProfile(userId: string): Promise<{
        id: string;
        avatar: string | null;
        createdAt: Date;
        email: string;
        username: string;
    }>;
    updateProfile(userId: string, dto: UpdateUserDto): Promise<{
        id: string;
        avatar: string | null;
        createdAt: Date;
        email: string;
        username: string;
    }>;
}
export {};
