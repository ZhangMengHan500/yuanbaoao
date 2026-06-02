import { Response } from 'express';
import { RecordingService } from './recording.service';
export declare class RecordingController {
    private readonly recordingService;
    private readonly logger;
    constructor(recordingService: RecordingService);
    processAudio(body: any, res: Response): Promise<void>;
    textToSpeech(body: {
        text: string;
    }, res: Response): Promise<void>;
    generateSummary(body: {
        text: string;
        duration?: string;
    }, res: Response): Promise<void>;
    generateAnalysis(body: {
        text: string;
        duration?: string;
    }, res: Response): Promise<void>;
}
