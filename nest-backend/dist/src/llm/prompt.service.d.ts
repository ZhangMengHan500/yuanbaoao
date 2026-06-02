export declare class PromptService {
    private aiGenTemplate;
    private img2imgTemplate;
    private aiEditTemplate;
    private cosTemplate;
    composeAiGenPrompt(stylePrompt: string, userDescription: string, aspectRatio?: string): Promise<string>;
    composeImg2ImgPrompt(stylePrompt: string, referenceDescription?: string): Promise<string>;
    composeEditPrompt(editInstruction: string, originalDescription?: string): Promise<string>;
    composeCosPrompt(characterName: string, characterDescription: string, stylePrompt: string): Promise<string>;
}
