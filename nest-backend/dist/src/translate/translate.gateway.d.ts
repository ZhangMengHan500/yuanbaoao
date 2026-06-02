import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TranslateService } from './translate.service';
import { RecordingService } from '../recording/recording.service';
export declare class TranslateGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly translateService;
    private readonly recordingService;
    private readonly logger;
    private clientStates;
    server: Server;
    constructor(translateService: TranslateService, recordingService: RecordingService);
    private generateId;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleStartTranslation(client: Socket, data: {
        sourceLang: string;
        targetLang: string;
        enableTts?: boolean;
    }): Promise<void>;
    handleAudioData(client: Socket, data: any): void;
    handleStopTranslation(client: Socket): Promise<void>;
    private connectToNLS;
    private handleNLSMessage;
    private translateSentence;
}
