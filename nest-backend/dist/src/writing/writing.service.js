"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WritingService = void 0;
const common_1 = require("@nestjs/common");
const llm_service_1 = require("../llm/llm.service");
const PLATFORM_GUIDE = {
    '公众号': '适合深度长文，可适当使用小标题分段，注重可读性和传播性',
    '知乎': '偏知识性和逻辑性，适合有深度的分析和见解，可引用数据和案例',
    '头条号': '标题党风格，内容通俗易懂，注重吸引眼球，段落简短',
    '百家号': '新闻资讯风格，客观叙述，注重信息量和时效性',
};
const STYLE_GUIDE = {
    '正式': '使用规范书面语，措辞严谨，结构清晰',
    '口语化': '像朋友聊天一样自然表达，可使用口语词汇',
    '幽默': '加入幽默元素，使文章轻松有趣',
    '夸张': '使用夸张修辞手法，增强表达效果',
    '简洁': '精炼表达，去除冗余，言简意赅',
    '古风': '使用古典文学风格，文言与白话结合',
    '抒情': '注重情感表达，语言优美，富有感染力',
    '讽刺': '使用讽刺手法，含蓄表达观点',
};
const NOVEL_GENRE_GUIDE = {
    '玄幻': '玄幻修仙类小说，包含灵力、功法、异世界等元素',
    '武侠': '传统武侠小说，江湖恩怨、武功绝学、侠义精神',
    '都市': '现代都市生活题材，职场、情感、日常',
    '现实': '现实主义题材，反映社会现象和人性',
    '历史': '历史题材小说，基于真实历史背景创作',
    '言情': '言情小说，以爱情为主线，细腻描写情感',
};
const EDU_STAGE_GUIDE = {
    '小学': '语言简单朴实，篇幅较短，适合小学生阅读水平',
    '初中': '语言规范，有一定深度，适合初中生阅读水平',
    '高中': '论证深入，结构严谨，适合高中生议论文/记叙文要求',
    '大学': '学术性强，论证严密，适合大学论文/报告水平',
    '研究生': '研究深度高，文献引用充分，符合研究生论文标准',
};
const GENRE_GUIDE = {
    '记叙文': '以叙述事件为主，包含时间、地点、人物、事件起因经过结果',
    '议论文': '提出论点，用论据论证，结构为引论-本论-结论',
    '说明文': '客观说明事物特征、原理、功能，语言准确平实',
    '散文': '形散神聚，语言优美，注重意境和情感表达',
    '诗歌': '押韵合辙，意象丰富，语言凝练，富有节奏感',
    '小说': '有完整故事情节，塑造人物形象，反映社会生活',
    '书信': '格式规范，语气得体，内容充实，表达真挚',
};
const MARKETING_TYPE_GUIDE = {
    '种草文': '以个人体验角度推荐产品，真实可信，突出使用感受',
    '推广文': '突出产品卖点，引导购买决策，有明确的行动号召',
    '品牌故事': '讲述品牌理念和故事，传递品牌价值观，增强认同感',
    '活动文案': '围绕营销活动，突出优惠信息，制造紧迫感',
    '产品介绍': '客观介绍产品功能、特点、使用方法，专业详细',
};
const MARKETING_STYLE_GUIDE = {
    '活泼': '语言轻松活泼，多用感叹号和emoji，富有感染力',
    '专业': '专业术语准确，数据支撑充分，权威可信',
    '走心': '情感共鸣强，故事化表达，温暖有温度',
    '搞笑': '幽默搞笑，段子式表达，易于传播',
    '高级': '用词精致，格调高雅，品牌调性一致',
};
const DOC_CATEGORY_GUIDE = {
    '通知': '发布传达要求或事项，语言简洁明确，格式规范',
    '报告': '汇报工作或反映情况，数据详实，分析客观',
    '请示': '向上级请求指示或批准，理由充分，语气恳切',
    '批复': '答复下级请示，态度明确，依据充分',
    '纪要': '记录会议主要内容和决定，客观准确',
    '函': '平行或不相隶属机关间商洽工作，语气平和',
    '意见': '对重要问题提出见解和处理办法，论证充分',
};
let WritingService = class WritingService {
    constructor(llmService) {
        this.llmService = llmService;
    }
    buildPrompt(dto) {
        const { writingType, filters, topic } = dto;
        let filterInstructions = '';
        switch (writingType) {
            case '通用': {
                const platform = filters.platform || '公众号';
                const style = filters.style || '正式';
                const wordCount = filters.wordCount || '1000';
                const platformGuide = PLATFORM_GUIDE[platform] || '按照通用风格写作';
                const styleGuide = STYLE_GUIDE[style] || '使用自然流畅的风格';
                filterInstructions = `### 发布平台
请针对「${platform}」平台的读者群体和内容风格进行写作：
- ${platform}：${platformGuide}

### 写作风格
请全程使用「${style}」风格：
- ${style}：${styleGuide}

### 字数要求
文章总字数控制在 ${wordCount} 字左右（允许10%浮动）。`;
                break;
            }
            case '小说': {
                const genre = filters.novelGenre || '不限';
                const genreGuide = genre !== '不限'
                    ? `### 小说类型
请按照「${genre}」类型进行创作：
- ${genre}：${NOVEL_GENRE_GUIDE[genre] || '自由发挥'}`
                    : '### 小说类型\n不限定类型，自由创作。';
                filterInstructions = `${genreGuide}

### 字数要求
创作约 2000 字的完整小说片段（允许10%浮动）。

### 创作要求
1. 有鲜明的人物形象和完整的故事情节
2. 环境描写生动，气氛营造到位
3. 对话自然，符合人物性格
4. 结尾留有悬念或完整收束`;
                break;
            }
            case '作文': {
                const eduStage = filters.eduStage || '高中';
                const genre = filters.genre || '议论文';
                const language = filters.language || '中文';
                const goldenQuote = filters.goldenQuote || '关闭';
                const stageGuide = EDU_STAGE_GUIDE[eduStage] || '';
                const genreGuide = GENRE_GUIDE[genre] || '';
                filterInstructions = `### 教育阶段
面向「${eduStage}」学生：
- ${eduStage}：${stageGuide}

### 文体要求
按照「${genre}」文体写作：
- ${genre}：${genreGuide}

### 语种
使用「${language}」写作。

### 金句模式
金句引用：${goldenQuote}${goldenQuote !== '关闭' ? '（在文章适当位置引用名人名言或经典语句，增强说服力和文采）' : ''}

### 字数要求
文章总字数控制在 800-1200 字左右。`;
                break;
            }
            case '作文素材': {
                const genre = filters.genre || '议论文';
                const language = filters.language || '中文';
                filterInstructions = `### 文体方向
为「${genre}」提供写作素材。

### 语种
使用「${language}」。

### 素材要求
1. 提供 3-5 个与主题相关的经典事例或论据
2. 每个素材包含：事件概述、适用论点、分析角度
3. 可包含名人名言、历史典故、时事热点
4. 素材之间要有层次递进关系`;
                break;
            }
            case '营销文案': {
                const type = filters.marketingType || '种草文';
                const style = filters.marketingStyle || '活泼';
                const target = filters.target || '通用';
                const length = filters.length || '中等';
                const typeGuide = MARKETING_TYPE_GUIDE[type] || '';
                const styleGuide = MARKETING_STYLE_GUIDE[style] || '';
                const lengthMap = {
                    '短文案': '100-200字',
                    '中等': '300-500字',
                    '长文案': '800-1000字',
                    '超长文案': '1500-2000字',
                };
                filterInstructions = `### 文案类型
按照「${type}」类型创作：
- ${type}：${typeGuide}

### 文案风格
全程使用「${style}」风格：
- ${style}：${styleGuide}

### 目标受众
面向「${target}」群体。

### 字数要求
文案长度：${lengthMap[length] || '300-500字'}。`;
                break;
            }
            case '公文': {
                const category = filters.docCategory || '通知';
                const format = filters.docFormat || '正式公文';
                const categoryGuide = DOC_CATEGORY_GUIDE[category] || '';
                filterInstructions = `### 公文类型
按照「${category}」文种撰写：
- ${category}：${categoryGuide}

### 格式要求
使用「${format}」格式。

### 写作要求
1. 语言规范，用词准确
2. 格式符合公文写作标准
3. 内容充实，逻辑清晰
4. 结构完整，层次分明`;
                break;
            }
            case '朋友圈': {
                const format = filters.circleFormat || '图文';
                const style = filters.circleStyle || '日常分享';
                filterInstructions = `### 形式
使用「${format}」形式。

### 风格
采用「${style}」风格。

### 写作要求
1. 语言自然真实，像日常分享
2. 适当使用emoji增加趣味性
3. 内容简短精炼，有个人特色
4. 字数控制在 200 字以内`;
                break;
            }
            default:
                filterInstructions = '按照通用写作要求完成。';
        }
        return `你是一位专业的中文写作助手。请根据以下要求，围绕主题「${topic}」撰写内容。

## 写作类型
${writingType}

${filterInstructions}

## 输出要求
1. 直接输出文章正文，不要输出任何前言或说明
2. 文章结构完整，包含开头、正文、结尾
3. 段落分明，每段表达一个完整的意思
4. 严格遵守上述写作要求
5. 不要输出"# 标题"等Markdown格式标记，直接输出纯文本`;
    }
    async *streamWrite(topic, systemPrompt) {
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `请围绕「${topic}」这个主题，按照上述要求写一篇完整的文章。` },
        ];
        yield* this.llmService.streamChat(messages);
    }
};
exports.WritingService = WritingService;
exports.WritingService = WritingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [llm_service_1.LlmService])
], WritingService);
//# sourceMappingURL=writing.service.js.map