"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptService = void 0;
const common_1 = require("@nestjs/common");
const prompts_1 = require("@langchain/core/prompts");
let PromptService = class PromptService {
    constructor() {
        this.aiGenTemplate = prompts_1.PromptTemplate.fromTemplate(`你是一位专业的AI绘图提示词工程师。请根据以下信息生成高质量的图片生成提示词。

风格要求：{stylePrompt}
用户描述：{userDescription}
图片比例：{aspectRatio}

请输出英文提示词，包含主体、风格、光影、构图等细节。`);
        this.img2imgTemplate = prompts_1.PromptTemplate.fromTemplate(`你是一位专业的AI绘图提示词工程师。请根据以下风格要求和用户参考图片，生成完整的图生图提示词。

风格要求：{stylePrompt}
用户参考图片描述：{referenceDescription}

要求：
1. 参考上传图中模特的面部和发型特征
2. 生成写实人像摄影风格提示词
3. 包含半身人像、光影、表情、服装等细节
4. 确保提示词自然流畅，无AI感

请输出中文提示词。`);
        this.aiEditTemplate = prompts_1.PromptTemplate.fromTemplate(`基于用户的编辑指令，生成图片编辑的提示词。

编辑指令：{editInstruction}
原始图片描述：{originalDescription}

请输出英文编辑提示词。`);
        this.cosTemplate = prompts_1.PromptTemplate.fromTemplate(`将用户照片转换为王者荣耀角色风格。

目标角色：{characterName}
角色描述：{characterDescription}
风格要求：{stylePrompt}

请输出英文COS转换提示词。`);
    }
    async composeAiGenPrompt(stylePrompt, userDescription, aspectRatio = '1:1') {
        return this.aiGenTemplate.format({
            stylePrompt,
            userDescription,
            aspectRatio,
        });
    }
    async composeImg2ImgPrompt(stylePrompt, referenceDescription = '用户上传的人像照片') {
        return this.img2imgTemplate.format({
            stylePrompt,
            referenceDescription,
        });
    }
    async composeEditPrompt(editInstruction, originalDescription = '') {
        return this.aiEditTemplate.format({
            editInstruction,
            originalDescription,
        });
    }
    async composeCosPrompt(characterName, characterDescription, stylePrompt) {
        return this.cosTemplate.format({
            characterName,
            characterDescription,
            stylePrompt,
        });
    }
};
exports.PromptService = PromptService;
exports.PromptService = PromptService = __decorate([
    (0, common_1.Injectable)()
], PromptService);
//# sourceMappingURL=prompt.service.js.map