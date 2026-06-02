import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class HomeworkService {
  private readonly logger = new Logger(HomeworkService.name);

  constructor(private readonly llmService: LlmService) {}

  /**
   * 流式批改作业（视觉模型直接识别 + 批改）
   * 流程: 图片 base64 → DashScope 视觉模型识别题目并批改 → 流式返回 Markdown
   */
  async *streamGrade(
    imageBase64: string,
    mimeType: string,
    extraText: string,
  ) {
    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    const extraSection = extraText
      ? `\n\n学生补充说明：${extraText}`
      : '';

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

    this.logger.log('开始调用视觉模型批改作业...');
    yield* this.llmService.streamChatWithVision(messages);
  }
}
