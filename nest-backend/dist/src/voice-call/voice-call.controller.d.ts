import { ConfigService } from '@nestjs/config';
import { RecordingService } from '../recording/recording.service';
export declare class VoiceCallController {
    private configService;
    private recordingService;
    private readonly logger;
    constructor(configService: ConfigService, recordingService: RecordingService);
    tts(body: {
        text: string;
        voice?: string;
    }): Promise<{
        audio: string;
    }>;
}
