import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { VoiceCallService } from './voice-call.service';
export declare class VoiceCallGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly voiceCallService;
    private readonly logger;
    private clientStates;
    server: Server;
    constructor(voiceCallService: VoiceCallService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleStartCall(client: Socket): Promise<void>;
    private sendGreeting;
    private connectToNLS;
    private handleNLSMessage;
    private processUserUtterance;
    private ttsAndSend;
    private callEdgeTTS;
    handleAudioData(client: Socket, data: any): void;
    handleInterrupt(client: Socket): void;
    handleAiDone(client: Socket): void;
    handleEndCall(client: Socket): Promise<void>;
    private generateId;
}
