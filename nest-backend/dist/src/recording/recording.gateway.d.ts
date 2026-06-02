import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RecordingService } from './recording.service';
export declare class RecordingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly recordingService;
    private readonly logger;
    private clientStates;
    server: Server;
    constructor(recordingService: RecordingService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleStartRecognition(client: Socket, data: {
        format?: string;
    }): Promise<void>;
    private connectToNLS;
    private handleNLSMessage;
    handleAudioData(client: Socket, data: any): void;
    handleStopRecognition(client: Socket): Promise<void>;
    handleSimulateRecognition(client: Socket, data: {
        audioBase64: string;
    }): Promise<void>;
    private generateId;
    private sleep;
}
