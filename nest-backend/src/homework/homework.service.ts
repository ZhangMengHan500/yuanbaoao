import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://localhost:5000';

@Injectable()
export class HomeworkService {
  private readonly logger = new Logger(HomeworkService.name);

  constructor(private readonly llmService: LlmService) {}

  /**
   * 调用 OCR 微服务识别图片中的文字
   */
  private async callOCR(imageBase64: string): Promise<string> {
    const url = `${OCR_SERVICE_URL}/ocr`;
    this.logger.log(`调用 OCR 微服务: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: imageBase64 }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`OCR 服务返回 ${response.status}`);
    }

    const result = await response.json() as { text?: string; error?: string };
    if (result.error) {
      throw new Error(result.error);
    }

    const text = result.text || '';
    this.logger.log(`OCR 识别完成, 共 ${text.length} 字`);
    return text;
  }

  /**
   * 流式批改作业 — 微服务架构
   * 流程: 图片 → OCR 微服务识别文字 → 文本模型批改 → 流式返回
   * 降级: OCR 失败时回退到视觉模型直接批改
   */
  async *streamGrade(
    imageBase64: string,
    mimeType: string,
    extraText: string,
  ) {
    const extraSection = extraText
      ? `\n\n学生补充说明：${extraText}`
      : '';

    // 第一步：尝试调用 OCR 微服务识别文字
    let recognizedText = '';
    let ocrSuccess = false;

    try {
      recognizedText = await this.callOCR(imageBase64);
      if (recognizedText.trim().length > 0) {
        ocrSuccess = true;
        this.logger.log('OCR 识别成功，使用文本模型批改');
      }
    } catch (err: any) {
      this.logger.warn(`OCR 微服务调用失败: ${err.message}，降级到视觉模型`);
    }

    if (ocrSuccess) {
      // 主路径：OCR 成功 → 用文本模型批改（便宜、快）
      yield* this.gradeWithTextModel(recognizedText, extraSection);
    } else {
      // 降级路径：OCR 失败 → 用视觉模型直接批改
      this.logger.log('降级到视觉模型批改');
      yield* this.gradeWithVisionModel(imageBase64, mimeType, extraSection);
    }
  }

  /**
   * 文本模型批改 — 基于 OCR 识别出的文字
   */
  private async *gradeWithTextModel(
    recognizedText: string,
    extraSection: string,
  ) {
    const messages: any[] = [
      {
        role: 'system',
        content: `你是一位经验丰富、认真负责的中小学教师。以下是通过 OCR 识别出的学生作业内容，请对作业进行专业批改。

注意：以下内容由 OCR 自动识别，可能存在识别错误。如果发现明显的识别错误（如乱码、缺字），请尽力推断原意并批改。

请严格按照以下 Markdown 格式输出：

---

## 作业批改结果

### 总体评价
（用1-2句话评价作业整体完成情况，先肯定做得好的地方）

### 逐题批改

#### 第 1 题
- **题目内容**：（识别出的题目）
- **学生答案**：（学生的答案）
- **批改结果**：✅ 正确 / ❌ 错误 / ⚠️ 部分正确
- **标准答案**：（给出正确答案）
- **详细解析**：（分步骤讲解，每一步清晰说明）
- **易错提醒**：（指出常见错误和注意事项）

#### 第 2 题
（同上格式，继续列出所有题目）

### 知识点总结
（列出本作业涉及的核心知识点，用列表格式）

### 学习建议
（针对薄弱环节给出2-3条具体的学习建议）

---

批改规则：
1. 严格判断对错，给出明确的 ✅❌⚠️ 标记
2. 解析要详细到每一步，让学生能理解
3. 指出错误的具体原因，不只是给正确答案
4. 语气鼓励为主，先肯定再指出不足
5. 对正确的题目也简要说明解题思路
6. 重点标注易错点和注意事项
7. 如果有公式，用反引号包裹显示`,
      },
      {
        role: 'user',
        content: `以下是 OCR 识别出的作业内容：

---
${recognizedText}
---

请认真批改这份作业，逐题给出详细的批改结果。${extraSection}`,
      },
    ];

    this.logger.log('使用文本模型（DeepSeek）批改作业...');
    yield* this.llmService.streamChat(messages);
  }

  /**
   * 视觉模型批改 — 降级方案，直接看图批改
   */
  private async *gradeWithVisionModel(
    imageBase64: string,
    mimeType: string,
    extraSection: string,
  ) {
    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    const messages: any[] = [
      {
        role: 'system',
        content: `你是一位经验丰富、认真负责的中小学教师。请对学生的作业进行专业批改。

请严格按照以下 Markdown 格式输出：

---

## 作业批改结果

### 总体评价
（用1-2句话评价作业整体完成情况，先肯定做得好的地方）

### 逐题批改

#### 第 1 题
- **题目内容**：（从图片中识别出的题目）
- **学生答案**：（学生手写的答案）
- **批改结果**：✅ 正确 / ❌ 错误 / ⚠️ 部分正确
- **标准答案**：（给出正确答案）
- **详细解析**：（分步骤讲解，每一步清晰说明）
- **易错提醒**：（指出常见错误和注意事项）

#### 第 2 题
（同上格式，继续列出所有题目）

### 知识点总结
（列出本作业涉及的核心知识点，用列表格式）

### 学习建议
（针对薄弱环节给出2-3条具体的学习建议）

---

批改规则：
1. 严格判断对错，给出明确的 ✅❌⚠️ 标记
2. 解析要详细到每一步，让学生能理解
3. 指出错误的具体原因，不只是给正确答案
4. 语气鼓励为主，先肯定再指出不足
5. 对正确的题目也简要说明解题思路
6. 重点标注易错点和注意事项
7. 如果图片中有公式，用反引号包裹显示
8. 如果图片模糊或无法识别，说明情况并尽力分析`,
      },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl } },
          {
            type: 'text',
            text: `请认真批改这份作业。仔细识别图片中的每一道题目和学生的答案，逐题给出详细的批改结果。${extraSection}`,
          },
        ],
      },
    ];

    this.logger.log('使用视觉模型（qwen-vl-plus）批改作业...');
    yield* this.llmService.streamChatWithVision(messages);
  }
}
