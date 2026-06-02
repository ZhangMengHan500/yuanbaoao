import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { VideoService } from './video.service';
export declare class VideoProgressGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly videoService;
    private readonly logger;
    server: Server;
    private clientSubscriptions;
    private jobSubscriptions;
    private pollTimers;
    constructor(videoService: VideoService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleSubscribe(client: Socket, data: {
        jobId: string;
    }): void;
    handleUnsubscribe(client: Socket, data: {
        jobId: string;
    }): void;
    private startPolling;
    private stopPolling;
    private checkAndNotify;
}
