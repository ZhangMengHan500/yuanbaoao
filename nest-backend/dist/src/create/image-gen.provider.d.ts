export interface ImageGenResult {
    imageUrl: string;
    status: 'completed' | 'failed';
    error?: string;
}
export interface IImageGenProvider {
    generateImage(prompt: string, options?: {
        negativePrompt?: string;
        referenceImageUrl?: string;
        width?: number;
        height?: number;
    }): Promise<ImageGenResult>;
}
export declare class MockImageGenProvider implements IImageGenProvider {
    private readonly logger;
    generateImage(prompt: string, options?: {
        negativePrompt?: string;
        referenceImageUrl?: string;
        width?: number;
        height?: number;
    }): Promise<ImageGenResult>;
}
