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
var HomeworkService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomeworkService = void 0;
const common_1 = require("@nestjs/common");
const llm_service_1 = require("../llm/llm.service");
let HomeworkService = HomeworkService_1 = class HomeworkService {
    constructor(llmService) {
        this.llmService = llmService;
        this.logger = new common_1.Logger(HomeworkService_1.name);
    }
    async *streamGrade(imageBase64, mimeType, extraText) {
        const dataUrl = `data:${mimeType};base64,${imageBase64}`;
        const extraSection = extraText
            ? `\n\n学生补充说明：${extraText}`
            : '';
        const messages = [
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
};
exports.HomeworkService = HomeworkService;
exports.HomeworkService = HomeworkService = HomeworkService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [llm_service_1.LlmService])
], HomeworkService);
//# sourceMappingURL=homework.service.js.map