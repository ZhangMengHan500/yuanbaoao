export interface HeroPrompt {
    name: string;
    previewPrompt: string;
    cosPrompt: string;
    description: string;
}
export declare const HERO_PROMPTS: Record<string, HeroPrompt>;
export declare function getHeroPrompt(heroName: string): HeroPrompt;
