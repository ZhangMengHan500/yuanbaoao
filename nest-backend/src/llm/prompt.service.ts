import { Injectable } from '@nestjs/common';
import { PromptTemplate } from '@langchain/core/prompts';

// LangChain 提示词管理服务
// 使用 PromptTemplate 组合模板风格 + 用户输入，生成最终的图片生成提示词
@Injectable()
export class PromptService {
  // AI生图 prompt 模板：组合用户描述 + 模板风格
  private aiGenTemplate = PromptTemplate.fromTemplate(
    `你是一位专业的AI绘图提示词工程师。请根据以下信息生成高质量的图片生成提示词。

风格要求：{stylePrompt}
用户描述：{userDescription}
图片比例：{aspectRatio}

请输出英文提示词，包含主体、风格、光影、构图等细节。`,
  );

  // 图生图 prompt 模板：根据参考图 + 风格提示词生成完整提示词
  private img2imgTemplate = PromptTemplate.fromTemplate(
    `你是一位专业的AI绘图提示词工程师。请根据以下风格要求和用户参考图片，生成完整的图生图提示词。

风格要求：{stylePrompt}
用户参考图片描述：{referenceDescription}

要求：
1. 参考上传图中模特的面部和发型特征
2. 生成写实人像摄影风格提示词
3. 包含半身人像、光影、表情、服装等细节
4. 确保提示词自然流畅，无AI感

请输出中文提示词。`,
  );

  // 智能P图 prompt 模板
  private aiEditTemplate = PromptTemplate.fromTemplate(
    `基于用户的编辑指令，生成图片编辑的提示词。

编辑指令：{editInstruction}
原始图片描述：{originalDescription}

请输出英文编辑提示词。`,
  );

  // 王者COS prompt 模板
  private cosTemplate = PromptTemplate.fromTemplate(
    `将用户照片转换为王者荣耀角色风格。

目标角色：{characterName}
角色描述：{characterDescription}
风格要求：{stylePrompt}

请输出英文COS转换提示词。`,
  );

  // 组合 AI 生图提示词
  async composeAiGenPrompt(
    stylePrompt: string,
    userDescription: string,
    aspectRatio: string = '1:1',
  ): Promise<string> {
    return this.aiGenTemplate.format({
      stylePrompt,
      userDescription,
      aspectRatio,
    });
  }

  // 组合图生图提示词
  async composeImg2ImgPrompt(
    stylePrompt: string,
    referenceDescription: string = '用户上传的人像照片',
  ): Promise<string> {
    return this.img2imgTemplate.format({
      stylePrompt,
      referenceDescription,
    });
  }

  // 组合智能 P 图提示词
  async composeEditPrompt(
    editInstruction: string,
    originalDescription: string = '',
  ): Promise<string> {
    return this.aiEditTemplate.format({
      editInstruction,
      originalDescription,
    });
  }

  // 组合王者 COS 提示词
  async composeCosPrompt(
    characterName: string,
    characterDescription: string,
    stylePrompt: string,
  ): Promise<string> {
    return this.cosTemplate.format({
      characterName,
      characterDescription,
      stylePrompt,
    });
  }
}
