# YuanBaoAI 项目功能实现详解

> 仿腾讯元宝 AI 对话 APP，涵盖 AI 对话、图像创作、教育工具、多媒体、效率工具五大领域。

---

## 一、项目架构总览

### 1.1 三端架构

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App (Web)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ 问元宝    │  │  创作     │  │  我们     │  │ 功能面板  │    │
│  │ (ChatStack)│  │(CreateStack)│ │(Profile) │  │(+号菜单) │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/SSE/WebSocket
┌───────────────────────────┴─────────────────────────────────┐
│                    NestJS Backend (:3000)                      │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
│  │  Auth  │ │  Chat  │ │  LLM   │ │Memory  │ │ 22+    │    │
│  │ Module │ │ Module │ │ Module │ │ Module │ │Modules │    │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘    │
└──────────┬──────────────────┬──────────────────┬────────────┘
           │                  │                  │
    ┌──────┴──────┐   ┌──────┴──────┐   ┌──────┴──────┐
    │ PostgreSQL  │   │  ChromaDB   │   │ Python SD   │
    │  (Prisma)   │   │ (向量检索)  │   │  Service    │
    │  :5432      │   │  :8000      │   │  :8000      │
    └─────────────┘   └─────────────┘   └─────────────┘
```

### 1.2 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 前端 | React Native (Expo Web) + TypeScript | 跨平台 UI |
| 状态管理 | Zustand | 轻量级状态管理 |
| 后端 | NestJS + TypeScript | REST API + SSE 流式 |
| 数据库 | PostgreSQL + Prisma ORM | 数据持久化 |
| 向量库 | ChromaDB | RAG 语义检索 |
| 记忆 | LangChain Memory | 多级对话记忆 |
| AI 推理 | DeepSeek / 通义千问 / DashScope | 大语言模型 |
| 图像生成 | Stable Diffusion 1.5 (本地) | img2img 推理 |
| 语音识别 | DashScope ASR | 语音转文字 |
| OCR | PaddleOCR (本地) | 文字识别 |

---

## 二、AI 核心对话能力

### 2.1 智能对话（ChatScreen）

**实现流程：**
```
用户输入 → ChatScreen.handleSend()
  → startSSEStream({ sessionId, content, personaId, enableRag, deepThinking, webSearch })
    → POST /chat/stream (NestJS)
      → ChatService.buildChatContext() 构建上下文
      → ChatService.streamReply() 流式调用 LLM
      → 逐 token 写入 SSE: data: {"token":"...","done":false}
    → 前端 ReadableStream 逐块解析，实时渲染
```

**关键文件：**
- 前端：`rn-app/src/screens/ChatScreen.tsx` — 主聊天界面
- 前端：`rn-app/src/services/sse.ts` — SSE 流式通信封装
- 后端：`nest-backend/src/chat/chat.controller.ts` — SSE 端点
- 后端：`nest-backend/src/chat/chat.service.ts` — 上下文构建 + 流式输出

**SSE 通信机制：**
```typescript
// 前端：fetch + ReadableStream 实现 POST SSE
const response = await fetch(`${API_BASE_URL}/chat/stream`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
  body: JSON.stringify({ sessionId, content, personaId, enableRag, deepThinking }),
});
const reader = response.body.getReader();
// 逐块读取，解析 data: {json}\n\n 格式
```

```typescript
// 后端：NestJS SSE 流式输出
res.setHeader('Content-Type', 'text/event-stream');
for await (const token of chatService.streamReply(messages)) {
  res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
}
res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
```

### 2.2 角色人设系统

**实现方式：**
- 数据库存储角色人设（Persona 表：name, systemPrompt, avatar）
- 对话时将角色的 `systemPrompt` 注入为第一条 system 消息
- 前端 PersonaScreen 提供角色选择 UI

**上下文构建顺序：**
```
1. 角色人设 (system prompt)
2. RAG 知识库检索结果 (可选)
3. 联网搜索结果 (可选)
4. 深度思考指令 (可选)
5. 历史消息 (LangChain 记忆)
6. 当前用户消息
```

**关键代码：**
```typescript
// chat.service.ts - buildChatContext()
if (effectivePersonaId) {
  const personaData = await this.prisma.persona.findUnique({ where: { id: effectivePersonaId } });
  contextMessages.push({ role: 'system', content: personaData.systemPrompt });
}
```

### 2.3 深度思考模式

**实现原理：**
- 开启后，向 LLM 注入两阶段思考指令
- LLM 先输出「【深度思考分析】」阶段，再输出「【最终答案】」阶段
- 前端通过 `thinkingPhaseRef` 追踪当前阶段，动态切换显示内容

**前端处理逻辑：**
```typescript
// ChatScreen.tsx - SSE token 处理
thinkingBufferRef.current += token;
const buf = thinkingBufferRef.current;
if (buf.includes('【深度思考分析】')) {
  thinkingPhaseRef.current = true;  // 进入思考阶段
  updateLastAssistantMessage(sid, token);  // 实时显示思考过程
}
if (buf.includes('【最终答案】')) {
  thinkingPhaseRef.current = false;  // 思考结束
  setLastAssistantContent(sid, answerContent);  // 替换为最终答案
}
```

### 2.4 联网搜索

**实现流程：**
```
用户开启🌐联网搜索 → 发送消息 { webSearch: true }
  → ChatService.buildChatContext() 检测 webSearch=true
  → WebSearchService.search(query) 调用百度搜索
  → 解析搜索结果，注入为 system 消息
  → LLM 基于搜索结果回答
```

**搜索服务（WebSearchService）：**
- 默认使用百度桌面版搜索（国内可用，无需 API Key）
- 可切换为 Tavily / SerpAPI（需配置 API Key）
- 搜索结果格式化后注入 LLM 上下文

**关键代码：**
```typescript
// web-search.service.ts
async search(query: string): Promise<string> {
  const tavilyKey = this.configService.get<string>('TAVILY_API_KEY');
  if (tavilyKey) results = await this.searchTavily(query, tavilyKey);
  else results = await this.searchBaidu(query);  // 默认百度搜索
  return this.formatResults(results);
}

// chat.service.ts - 注入搜索结果
if (webSearch) {
  const searchContext = await this.webSearchService.search(userMessage);
  contextMessages.push({
    role: 'system',
    content: `以下是联网搜索获取的最新信息，请优先参考以下信息回答用户问题：\n\n${searchContext}`,
  });
}
```

### 2.5 RAG 知识库

**实现流程：**
```
用户上传文档 → POST /knowledge/upload
  → 提取文本 → 分块 (DocChunkerService)
  → 存储到 PostgreSQL (ReadingChunk)
  → 向量化存储到 ChromaDB
  ↓
用户提问 → enableRag=true
  → ChromaDB 语义检索 top-5 相关分块
  → 注入为 system 消息
  → LLM 基于检索结果回答
```

**向量检索：**
```typescript
// knowledge.service.ts
async queryDocuments(query: string): Promise<string> {
  const results = await this.chromaClient.getCollection('yuanbao_knowledge')
    .query({ queryTexts: [query], nResults: 5 });
  return results.documents[0].join('\n\n');
}
```

### 2.6 多级记忆系统

**LangChain Memory 工厂模式：**
```typescript
// memory.factory.ts - 根据环境变量选择记忆方案
MEMORY_TYPE=memory   → MemoryService (内存，重启丢失)
MEMORY_TYPE=redis    → RedisMemoryService (Redis，持久化)
MEMORY_TYPE=postgres → PostgresMemoryService (PostgreSQL，持久化)
```

**消息双写策略：**
```typescript
// 保存消息时同时写入数据库 + 记忆系统
async saveUserMessage(sessionId: string, content: string) {
  await this.messageService.createMessage(sessionId, 'user', content);  // 数据库
  await memoryService.saveMessage(sessionId, { role: 'user', content });  // 记忆
}
```

---

## 三、AI 图像创作

### 3.1 AI 生图（Stable Diffusion）

**架构：**
```
前端 AiGenScreen → POST /create/ai-gen (NestJS)
  → NestJS 调用 Python Service (localhost:8000)
  → Stable Diffusion img2img 推理
  → 每步推理回调 NestJS 报告进度
  → 生成完成，返回图片 URL
```

**Python 推理服务：**
```python
# python-service/app.py
from diffusers import StableDiffusionPipeline
model = StableDiffusionPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    torch_dtype=torch.float16,
).to("cuda")
model.enable_attention_slicing()  # 适配 4GB 显存

@app.post("/generate")
async def generate(image, prompt, strength, steps):
    result = model(prompt=prompt, image=input_image, strength=strength, num_inference_steps=steps)
    return {"imageUrl": filepath, "imageBase64": base64}
```

### 3.2 智能 P 图

**支持的编辑功能：**
| 功能 | Prompt |
|------|--------|
| 扩图 | 一键扩图 |
| 变清晰 | 把图片变清晰 |
| 人像美颜 | 把图片中的人物美颜 |
| 去除杂物 | 去除图片中的杂物 |
| 图片美化 | 一键图片美化 |
| 风格迁移 | 用户自定义风格 Prompt |

**实现：** 复用 SD img2img 管线，通过不同 Prompt 实现不同编辑效果。

### 3.3 王者 COS 照

**实现流程：**
```
用户选择英雄 + 上传人脸照片
  → NestJS 调用 SD img2img（英雄 Prompt + 人脸参考图）
  → 生成 COS 照片
  → 返回结果 URL
```

**英雄数据：** 从数据库读取（CosHero 表：name, color, cosPrompt, previewPrompt）

---

## 四、AI 教育工具

### 4.1 拍题答疑

**实现方式：** 端到端视觉模型识别 + 解题
```
用户拍照/选图 → POST /chat/photo-solve
  → 图片转 base64
  → 调用 DashScope 视觉模型（qwen-vl-plus）
  → 视觉模型一次性识别题目并解题
  → SSE 流式返回 Markdown 格式解答
```

**关键点：** 不使用 OCR 服务，直接用视觉大模型端到端处理，效果更好。

### 4.2 作业批改

**实现方式：** 与拍题答疑类似的端到端方案
```
用户拍照作业 → POST /homework/grade
  → 图片转 base64
  → 调用视觉模型，System Prompt 要求输出批改格式
  → 流式返回：总体评价 → 逐题批改 → 知识点总结 → 学习建议
```

**批改格式 Prompt：**
```
请按以下格式批改：
## 总体评价
## 逐题批改
1. **题目内容**：xxx
   **学生答案**：xxx
   **批改结果**：✓正确 / ✗错误
   **标准答案**：xxx
   **详细解析**：xxx
## 知识点总结
## 学习建议
```

### 4.3 AI 出卷

**三种模式：**

| 模式 | 输入 | 生成逻辑 |
|------|------|---------|
| 相似卷 | 试卷图片 | 视觉模型识别题目 → LLM 生成同知识点相似题 |
| 错题巩固卷 | 试卷图片 | 识别薄弱知识点 → 针对性生成练习 |
| 自定义试卷 | 文字描述 | 直接根据描述生成 |

**实现流程：**
```
POST /exam/generate/similar|review|custom (SSE 流式)
  → ExamService.parseExamImage() 视觉模型识别题目 JSON
  → ExamService.generateSimilarExam() / generateReviewExam() / generateCustomExam()
  → LLM 流式生成试卷内容
  → SSE 逐 token 返回
```

### 4.4 文档阅读

**完整 RAG 管线：**
```
上传文档 (PDF/TXT)
  → pdf-parse 提取文本
  → DocChunkerService 分块 (512字符/块, 128字符overlap)
  → 存储到 PostgreSQL (ReadingChunk)
  → ChromaDB 向量化存储
  → 异步调用 LLM 生成摘要 (执行摘要+关键要点+大纲)
  → 文档状态变为 ready
  ↓
文档问答:
  用户问题 → ChromaDB 语义检索 top-5
  → 注入 system 消息 → LLM 回答
  → 回答中 [数字] 引用标记 → 前端可点击查看原文
```

**摘要生成：**
```typescript
// doc-summary.service.ts
async generateSummaries(docId, chunks) {
  const fullText = chunks.map(c => c.content).join('\n\n');
  const [executive, keyPoints, outline] = await Promise.all([
    this.generateExecutiveSummary(fullText),  // 执行摘要 200-300字
    this.generateKeyPoints(fullText),         // 关键要点 JSON 数组
    this.generateOutline(chunks),             // 大纲
  ]);
  // 存储到 ReadingSummary 表
}
```

---

## 五、AI 多媒体

### 5.1 AI 录音笔

**实时转写架构：**
```
前端录音 → WebSocket (Socket.IO) → NestJS RecordingGateway
  → DashScope ASR 实时识别
  → interim-result 事件 → 前端实时显示转写文本
  → recognition-complete 事件 → 触发 AI 总结 + 分析
```

**技术栈：** Socket.IO 双向通信 + DashScope 实时语音识别

### 5.2 AI 语音通话

**实现：** TTS（文本转语音）+ LLM 对话
```
用户语音输入 → ASR 识别 → LLM 生成回复 → TTS 合成语音 → 播放
```

### 5.3 AI 生视频

**实现：** 调用外部视频生成 API（如 SiliconFlow）
```
用户输入 Prompt → POST /video/generate → 异步生成 → 轮询进度 → 返回视频 URL
```

### 5.4 语音输入（ChatInput）

**实现：** MediaRecorder 录音 → 后端 ASR 识别
```
点击话筒 → MediaRecorder 录音 → 停止录音
  → 音频转 base64 → POST /recording/process
  → 后端 DashScope ASR 识别 → 返回文字
  → 填入输入框
```

---

## 六、AI 效率工具

### 6.1 AI 写作

**实现：** 根据写作类型 + 主题 + 风格，调用 LLM 生成
```
POST /writing/generate (SSE 流式)
  → WritingService 根据 type 构造 Prompt
  → LLM 流式生成
  → SSE 返回
```

### 6.2 翻译

**实现：** 支持文本翻译 + 拍照翻译（OCR + 翻译）
```
文本翻译: POST /translate/stream (SSE)
拍照翻译: POST /translate/photo → OCR 提取文字 → 翻译
```

---

## 七、核心基础设施

### 7.1 LLM 服务抽象层

```typescript
// llm.service.ts - 统一的大模型调用接口
@Injectable()
export class LlmService {
  private chatModel: ChatOpenAI;        // DeepSeek (默认)
  private visionModel: ChatOpenAI;      // DashScope qwen-vl-plus
  private dashscopeTextModel: ChatOpenAI; // DashScope qwen-plus

  async *streamChat(messages) { ... }        // 流式文本对话
  async *streamChatWithVision(messages) { ... } // 流式视觉对话
  async chat(messages): Promise<string> { ... } // 非流式对话
}
```

**模型切换：** 通过 `.env` 配置 `LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL` 即可切换。

### 7.2 文件上传

- Multer 中间件处理文件上传
- 上传目录：`./uploads/`（按功能分子目录）
- 静态文件服务：`app.useStaticAssets(uploadDir, { prefix: '/uploads' })`
- 文件大小限制：50MB（可配置）

### 7.3 认证体系

- JWT 令牌认证
- `@UseGuards(JwtAuthGuard)` 路由级权限
- `@CurrentUser('id')` 获取当前用户 ID

---

## 八、前端组件架构

### 8.1 导航结构

```
App.tsx (BottomTabNavigator)
├── Chat (ChatStack)
│   ├── ChatRoom (主聊天)
│   ├── HomeworkGrade (作业批改)
│   ├── Recording (录音笔)
│   ├── AiWrite (写作)
│   ├── VoiceCall (语音通话)
│   ├── Knowledge (知识库)
│   ├── DocReader (文档阅读)
│   ├── AiVideoGen (视频生成)
│   └── AiExam (AI出卷)
├── Create (CreateStack)
│   ├── CreateHome (创作首页)
│   ├── AiGen (AI生图)
│   ├── SmartEdit (智能P图)
│   ├── Cos (王者COS)
│   ├── Img2Img (图生图)
│   └── AiImageGen (图像生成)
└── Profile (ProfileStack)
    ├── ProfileHome (个人中心)
    └── Register (注册)
```

### 8.2 状态管理（Zustand）

每个功能模块有独立的 Store：
- `chatStore.ts` — 会话/消息管理
- `smartEditStore.ts` — 智能P图状态
- `cosStore.ts` — COS 照状态
- `createStore.ts` — 创作模板数据
- `useDocReaderStore.ts` — 文档阅读状态

### 8.3 公共组件

- `ChatInput.tsx` — 输入框（支持语音、图片、发送）
- `ChatActionPanel.tsx` — +号功能面板（14个入口）
- `MessageBubble.tsx` — 消息气泡（支持 Markdown、引用标记）
- `SidebarDrawer.tsx` — 侧边栏抽屉

---

## 九、数据模型

### 核心表

| 表名 | 用途 |
|------|------|
| User | 用户信息 |
| Session | 对话会话 |
| Message | 对话消息 |
| Persona | 角色人设 |
| KnowledgeDoc | 知识库文档 |
| ReadingDoc | 文档阅读 - 文档 |
| ReadingChunk | 文档阅读 - 分块 |
| DocConversation | 文档问答对话 |
| DocMessage | 文档问答消息 |
| ReadingSummary | 文档摘要 |
| CosHero | 王者英雄数据 |
| AiStyleTemplate | AI 风格模板 |
| ImageJob | 图片生成任务 |
| VideoJob | 视频生成任务 |

---

## 十、环境配置

### .env 关键配置

```env
# 数据库
DATABASE_URL="postgresql://postgres:123456@localhost:5432/yuanbao_ai"

# 大模型（支持 OpenAI 兼容接口）
LLM_API_KEY=sk-xxx
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat

# DashScope（视觉模型 + ASR）
DASHSCOPE_API_KEY=sk-xxx

# 向量数据库
CHROMA_URL=http://localhost:8000
SILICONFLOW_API_KEY=sk-xxx

# 联网搜索（可选）
TAVILY_API_KEY=tvly-xxx
SERP_API_KEY=xxx

# OCR 服务
OCR_SERVICE_URL=http://localhost:5000
```

### 启动命令

```bash
# 后端
cd nest-backend && npm run start:dev

# 前端
cd rn-app && npx expo start --web

# Python SD 服务（可选）
cd python-service && python app.py

# OCR 服务（可选）
cd ocr-service && python app.py
```

---

## 十一、功能数量统计

| 维度 | 数量 |
|------|------|
| 前端页面 | 25 个 |
| 后端模块 | 22 个 |
| 功能入口 | 14 个（+号菜单） |
| Python 服务 | 2 个 |
| 数据库模型 | 14+ 个 |
| API 端点 | 60+ 个 |
| 支持的 AI 模型 | 4 个（DeepSeek/通义千问/DashScope VL/DashScope ASR） |
