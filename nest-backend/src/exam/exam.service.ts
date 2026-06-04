import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ExamService {
  private readonly logger = new Logger(ExamService.name);

  constructor(private llmService: LlmService) {}

  async parseExamImage(imagePath: string): Promise<ExamContent> {
    this.logger.log(`[Exam] 开始解析试卷图片: ${imagePath}`);

    let imageDataUrl = imagePath;
    const uploadsMatch = imagePath.match(/\/uploads\/.+/);
    if (uploadsMatch) {
      const filePath = path.join(process.cwd(), uploadsMatch[0]);
      const buf = fs.readFileSync(filePath);
      const ext = uploadsMatch[0].split('.').pop() || 'jpg';
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      imageDataUrl = `data:${mime};base64,${buf.toString('base64')}`;
    }

    const messages = [
      {
        role: 'system',
        content: `你是专业的试卷识别助手。请仔细识别图片中的所有题目，按以下JSON格式返回：

{
  "title": "试卷标题（如有）",
  "subject": "学科（如：数学、语文、英语、物理等）",
  "grade": "年级（如：初中一年级、高中二年级等）",
  "questions": [
    {
      "index": 1,
      "type": "题型（选择题/填空题/解答题/判断题等）",
      "content": "题目完整文本",
      "options": ["A. xxx", "B. xxx", "C. xxx", "D. xxx"],
      "knowledge": "涉及的知识点",
      "difficulty": "难度（简单/中等/困难）"
    }
  ]
}

要求：
1. 完整识别每道题目的文本，不要遗漏
2. 选择题必须列出所有选项
3. 准确判断题型和知识点
4. 只返回JSON，不要其他内容`,
      },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageDataUrl } },
          { type: 'text', text: '请识别这张试卷图片中的所有题目' },
        ],
      },
    ];

    let result = '';
    for await (const token of this.llmService.streamChatWithVision(messages)) {
      result += token;
    }

    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      this.logger.error(`[Exam] 解析JSON失败: ${e.message}`);
    }

    return { title: '未知试卷', subject: '未知', grade: '未知', questions: [] };
  }

  async *generateSimilarExam(content: ExamContent, count: number = 10) {
    const qList = content.questions.map(q =>
      `${q.index}. [${q.type}] ${q.content}${q.options?.length ? '\n选项：' + q.options.join(' ') : ''}`
    ).join('\n\n');

    const prompt = `你是一位专业的试卷命题专家。基于以下试卷内容，生成一份相似的试卷。

【原始试卷】学科：${content.subject} 年级：${content.grade}

【原始题目】
${qList}

【生成要求】
1. 生成 ${count} 道相似题目
2. 保持相同学科和年级，覆盖相同知识点，题目内容不同
3. 保持相似的难度分布，选择题保持4个选项

请按以下格式输出：
# ${content.subject}相似练习卷

## 一、选择题
1. 题目
A. 选项
B. 选项
C. 选项
D. 选项

## 二、填空题
...

## 三、解答题
...

---
### 参考答案
1. 答案
...`;

    yield* this.llmService.streamChat([{ role: 'user', content: prompt }]);
  }

  async *generateReviewExam(content: ExamContent, weakPoints: string[]) {
    const points = weakPoints.length > 0
      ? weakPoints.join('、')
      : content.questions.map(q => q.knowledge).filter(Boolean).join('、');

    const qList = content.questions.map(q =>
      `${q.index}. [${q.type}] ${q.content}${q.options?.length ? '\n选项：' + q.options.join(' ') : ''}`
    ).join('\n\n');

    const prompt = `你是一位专业的试卷命题专家。基于以下错题信息，生成一份针对性的巩固练习卷。

【薄弱知识点】${points}

【原始错题】
${qList}

【生成要求】
1. 针对薄弱知识点生成强化练习
2. 每个知识点至少2道题
3. 难度从易到难递进
4. 包含详细解析

请按以下格式输出：
# ${content.subject}错题巩固卷

## 针对知识点：${points}

## 一、基础巩固（简单）
...

## 二、能力提升（中等）
...

## 三、挑战拓展（困难）
...

---
### 详细解析
1. **答案**：xxx
   **解析**：xxx
...`;

    yield* this.llmService.streamChat([{ role: 'user', content: prompt }]);
  }

  async *generateCustomExam(params: CustomExamParams) {
    // 判断是否有结构化字段（subject/grade 等被显式传入）
    const hasStructuredFields = !!(params.subject || params.grade || params.questionTypes || params.questionCount || params.difficulty || params.knowledgePoints);

    let prompt: string;

    if (hasStructuredFields) {
      // 有结构化字段时，用字段构建 prompt
      prompt = `你是一位专业的试卷命题专家。请根据以下要求生成一份试卷。

【出题要求】
学科：${params.subject || '数学'}
年级：${params.grade || '初中一年级'}
题型：${params.questionTypes || '选择题、填空题、解答题'}
数量：${params.questionCount || 10}道
难度：${params.difficulty || '中等'}
知识点：${params.knowledgePoints || '综合'}
${params.description ? `\n【补充说明】\n${params.description}` : ''}

请严格按以下要求生成试卷，确保题目内容与出题要求完全匹配。输出格式：

# ${params.subject || '学科'}${params.grade || ''}练习卷

## 一、选择题
...

## 二、填空题
...

## 三、解答题
...

---
### 参考答案与解析
...`;
    } else {
      // 只有 description 时，让 LLM 从描述中自主解析所有信息
      prompt = `你是一位专业的试卷命题专家。请根据用户的需求生成一份试卷。

【用户需求】
${params.description}

请先分析用户需求，提取学科、年级、题型、数量、难度、知识点等信息，然后严格按提取的信息生成试卷。

要求：
1. 仔细分析用户描述，准确提取学科、年级、题型、数量等要求
2. 如果用户没有明确指定某些参数，根据学科和年级合理推断
3. 题目内容必须与用户描述的主题和要求高度匹配
4. 严格按照用户要求的题型和数量出题

输出格式：

# [根据需求生成的标题]

## 一、[题型名称]
[题目内容]

## 二、[题型名称]
...

---
### 参考答案与解析
...`;
    }

    yield* this.llmService.streamChat([{ role: 'user', content: prompt }]);
  }
}

interface ExamContent {
  title: string;
  subject: string;
  grade: string;
  questions: {
    index: number;
    type: string;
    content: string;
    options?: string[];
    knowledge?: string;
    difficulty?: string;
  }[];
}

interface CustomExamParams {
  subject?: string;
  grade?: string;
  questionTypes?: string;
  questionCount?: number;
  difficulty?: string;
  knowledgePoints?: string;
  description?: string;
}
