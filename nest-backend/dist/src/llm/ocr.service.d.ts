import { ConfigService } from '@nestjs/config';
export declare class OcrService {
    private configService;
    private readonly logger;
    private client;
    constructor(configService: ConfigService);
    recognizeText(imageBase64: string): Promise<string>;
}
