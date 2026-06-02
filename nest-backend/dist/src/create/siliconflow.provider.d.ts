import { IImageGenProvider, ImageGenResult } from './image-gen.provider';
export declare class SiliconFlowProvider implements IImageGenProvider {
    private readonly logger;
    private enhancePrompt;
    generateImage(prompt: string, options?: {
        negativePrompt?: string;
        referenceImageUrl?: string;
        width?: number;
        height?: number;
    }): Promise<ImageGenResult>;
    private imageToBase64;
}
