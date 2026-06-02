import { Response } from 'express';
import { TranslateService } from './translate.service';
export declare class TranslateController {
    private readonly translateService;
    constructor(translateService: TranslateService);
    streamTranslate(body: {
        text: string;
        sourceLang: string;
        targetLang: string;
    }, res: Response): Promise<void>;
    photoTranslate(body: {
        imageBase64: string;
        sourceLang: string;
        targetLang: string;
    }, res: Response): Promise<void>;
    translateTTS(body: {
        text: string;
        lang?: string;
    }, res: Response): Promise<void>;
}
