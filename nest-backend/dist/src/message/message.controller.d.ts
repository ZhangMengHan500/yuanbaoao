import { MessageService } from './message.service';
declare class CreateMessageDto {
    sessionId: string;
    role: string;
    content: string;
}
export declare class MessageController {
    private readonly messageService;
    constructor(messageService: MessageService);
    getMessages(sessionId: string): Promise<{
        id: string;
        createdAt: Date;
        imageUrl: string | null;
        sessionId: string;
        role: string;
        content: string;
    }[]>;
    createMessage(dto: CreateMessageDto): Promise<{
        id: string;
        createdAt: Date;
        imageUrl: string | null;
        sessionId: string;
        role: string;
        content: string;
    }>;
}
export {};
