"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ExamService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamService = void 0;
const common_1 = require("@nestjs/common");
const llm_service_1 = require("../llm/llm.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let ExamService = ExamService_1 = class ExamService {
    constructor(llmService) {
        this.llmService = llmService;
        this.logger = new common_1.Logger(ExamService_1.name);
    }
    async parseExamImage(imagePath) {
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
        }
        catch (e) {
            this.logger.error(`[Exam] 解析JSON失败: ${e.message}`);
        }
        return { title: '未知试卷', subject: '未知', grade: '未知', questions: [] };
    }
    async *generateSimilarExam(content, count = 10) {
        const qList = content.questions.map(q => `${q.index}. [${q.type}] ${q.content}${q.options?.length ? '\n选项：' + q.options.join(' ') : ''}`).join('\n\n');
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
    async *generateReviewExam(content, weakPoints) {
        const points = weakPoints.length > 0
            ? weakPoints.join('、')
            : content.questions.map(q => q.knowledge).filter(Boolean).join('、');
        const qList = content.questions.map(q => `${q.index}. [${q.type}] ${q.content}${q.options?.length ? '\n选项：' + q.options.join(' ') : ''}`).join('\n\n');
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
    async *generateCustomExam(params) {
        const prompt = `你是一位专业的试卷命题专家。请根据以下要求生成一份试卷。

【出题要求】
学科：${params.subject || '数学'}
年级：${params.grade || '初中一年级'}
题型：${params.questionTypes || '选择题、填空题、解答题'}
数量：${params.questionCount || 10}道
难度：${params.difficulty || '中等'}
知识点：${params.knowledgePoints || '综合'}
${params.description ? `\n【补充说明】\n${params.description}` : ''}

请按以下格式输出：
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
        yield* this.llmService.streamChat([{ role: 'user', content: prompt }]);
    }
};
exports.ExamService = ExamService;
exports.ExamService = ExamService = ExamService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [llm_service_1.LlmService])
], ExamService);
//# sourceMappingURL=exam.service.js.map