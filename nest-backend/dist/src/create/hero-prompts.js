"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HERO_PROMPTS = void 0;
exports.getHeroPrompt = getHeroPrompt;
exports.HERO_PROMPTS = {
    蚩妩: {
        name: '蚩妩',
        previewPrompt: '王者荣耀蚩妩, 全身照, 元气国风少女, 黑白色短发, 黄橙挑染, 黄色国风服饰, 灵动俏皮, 元气可爱, 高清写实, 王者荣耀官方原画质感, 真人cos写真, 电影级光影, 精致五官, 细腻皮肤, 高清8k, 适合AI换脸模板, 竖版9:16, masterpiece, best quality, highly detailed, cinematic lighting, 柔和高级感',
        cosPrompt: '蚩妩cosplay, 全身照, 元气国风少女, 黑白色短发黄橙挑染, 黄色国风服饰, 灵动俏皮, 写实真人, 电影光影, 8k, 高清',
        description: 'Spunky national style girl with colorful hair',
    },
    大乔: {
        name: '大乔',
        previewPrompt: '王者荣耀大乔, 全身照, 温柔古风少女, 深蓝色长发, 水蓝色仙气纱裙, 温柔优雅, 仙气飘飘, 古风汉服, 水波纹元素, 梦幻唯美, 高清写实, 王者荣耀官方原画质感, 真人cos写真, 电影级光影, 精致五官, 细腻皮肤, 高清8k, 适合AI换脸模板, 竖版9:16, masterpiece, best quality, highly detailed, cinematic lighting, 柔和高级感',
        cosPrompt: '大乔cosplay, 全身照, 温柔古风少女, 深蓝色长发, 水蓝色仙气纱裙, 古风汉服, 仙气飘飘, 写实真人, 电影光影, 8k, 高清',
        description: 'Gentle ancient girl with deep blue hair and blue gauze dress',
    },
    朵莉亚: {
        name: '朵莉亚',
        previewPrompt: '王者荣耀朵莉亚, 全身照, 人鱼少女, 蓝白渐变长发, 蓝色梦幻眼眸, 人鱼精灵, 梦幻海洋人鱼风, 梦幻唯美, 海洋元素, 浅蓝鱼尾服饰, 甜美灵动, 高清写实, 王者荣耀官方原画质感, 真人cos写真, 电影级光影, 精致五官, 细腻皮肤, 高清8k, 适合AI换脸模板, 竖版9:16, masterpiece, best quality, highly detailed, cinematic lighting, 柔和高级感',
        cosPrompt: '朵莉亚cosplay, 全身照, 人鱼少女, 蓝白渐变长发, 蓝色梦幻眼眸, 人鱼精灵, 海洋人鱼风, 浅蓝鱼尾服饰, 甜美灵动, 写实真人, 电影光影, 8k, 高清',
        description: 'Mermaid girl with blue-white gradient hair',
    },
    李白: {
        name: '李白',
        previewPrompt: '王者荣耀李白, 全身照, 少年侠客, 潇洒帅气, 清冷古风, 黑色长发, 白色束发, 白衣古风侠客服饰, 眉眼锐利, 潇洒不羁, 高清写实, 王者荣耀官方原画质感, 真人cos写真, 电影级光影, 精致五官, 细腻皮肤, 氛围感, 高清8k, 柔和高级, 适合AI换脸模板, 竖版9:16, masterpiece, best quality, highly detailed, cinematic lighting, 柔和高级感',
        cosPrompt: '李白cosplay, 全身照, 少年侠客, 潇洒帅气, 清冷古风, 黑色长发白色束发, 白衣侠客服饰, 眉眼锐利, 潇洒不羁, 写实真人, 电影光影, 8k, 高清',
        description: 'Handsome swordsman in white ancient robes',
    },
    貂蝉: {
        name: '貂蝉',
        previewPrompt: '王者荣耀貂蝉, 全身照, 绝世舞姬, 妩媚古风, 酒红色长发, 华丽古风舞裙, 眉眼妩媚, 明艳动人, 温柔大气, 花瓣氛围感, 高清写实, 王者荣耀官方原画质感, 真人cos写真, 电影级光影, 精致五官, 细腻皮肤, 高清8k, 适合AI换脸模板, 竖版9:16, masterpiece, best quality, highly detailed, cinematic lighting, 柔和高级感',
        cosPrompt: '貂蝉cosplay, 全身照, 绝世舞姬, 妩媚古风, 酒红色长发, 华丽古风舞裙, 眉眼妩媚, 明艳动人, 写实真人, 电影光影, 8k, 高清',
        description: 'Enchanting dancer in ancient dress',
    },
    孙悟空: {
        name: '孙悟空',
        previewPrompt: '1boy, solo, full body, standing, monkey king, golden armor with dragon engravings, phoenix feather golden cap, fiery golden eyes, wielding golden staff with both hands, battle pose, fire and clouds background, divine warrior, beautiful, anime style, masterpiece, best quality, highly detailed',
        cosPrompt: '1boy, cosplay, golden armor, phoenix cap, golden staff, fire clouds, divine warrior, detailed, 8k',
        description: 'Monkey King',
    },
    韩信: {
        name: '韩信',
        previewPrompt: '1boy, solo, full body, standing, chinese general, silver and red battle armor with dragon engravings, holding long dragon spear with red tassels, short spiky black hair, fierce determined expression, battlefield background with war banners and fire, warrior stance, cape flowing, beautiful, anime style, masterpiece, best quality, highly detailed',
        cosPrompt: '1boy, cosplay, silver red armor, dragon spear, fierce expression, battlefield, fire, detailed, 8k',
        description: 'General with dragon spear',
    },
    赵云: {
        name: '赵云',
        previewPrompt: '1boy, solo, full body, standing, chinese warrior, white and silver dragon armor with blue dragon emblem on chest, holding long silver dragon spear with blue tassels, flowing white cape, noble expression, long black hair, mountain battlefield with cloudy sky, heroic, beautiful, anime style, masterpiece, best quality, highly detailed',
        cosPrompt: '1boy, cosplay, white silver armor, dragon spear, white cape, noble, mountain background, detailed, 8k',
        description: 'Dragon warrior in white',
    },
};
function getHeroPrompt(heroName) {
    return (exports.HERO_PROMPTS[heroName] || {
        name: heroName,
        previewPrompt: `王者荣耀${heroName}, beautiful Chinese game character, detailed costume, epic fantasy background, high quality portrait, 8k photorealistic`,
        cosPrompt: `王者荣耀${heroName}cosplay, detailed Chinese game character costume, epic fantasy portrait, high quality, 8k photorealistic`,
        description: `Chinese game character ${heroName}`,
    });
}
//# sourceMappingURL=hero-prompts.js.map