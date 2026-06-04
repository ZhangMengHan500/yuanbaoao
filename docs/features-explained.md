# 元宝AI — 全功能大白话实现详解

> 本文档用最直白的语言，结合最核心的代码，讲清楚每个功能是怎么实现的。

---

## 目录

1. [智能P图](#1-智能p图)
2. [拍照答疑](#2-拍照答疑)
3. [作业批改](#3-作业批改)
4. [AI生图](#4-ai生图)
5. [AI录音笔](#5-ai录音笔)
6. [AI写作](#6-ai写作)
7. [王者COS照](#7-王者cos照)
8. [打电话](#8-打电话)
9. [AI生视频](#9-ai生视频)
10. [文档阅读](#10-文档阅读)
11. [AI出卷](#11-ai出卷)
12. [知识库](#12-知识库)
13. [深度思考](#13-深度思考)
14. [联网搜索](#14-联网搜索)

---

## 底层共用的 AI 模型

所有功能都依赖这几个 AI 模型（在 `llm.service.ts` 中配置）：

| 模型 | 用途 | 服务商 |
|------|------|--------|
| `deepseek-chat` | 文本对话、写作、出卷 | DeepSeek API |
| `qwen-vl-plus` | 看图答题、批改作业（视觉模型） | 阿里云 DashScope |
| `qwen-plus` | 录音总结、分析 | 阿里云 DashScope |
| `Kwai-Kolors/Kolors` | 生成图片 | 硅基流动 SiliconFlow |
| `Wan2.2` | 生成视频 | 硅基流动 SiliconFlow |
| `BAAI/bge-m3` | 文本向量化（知识库/文档检索） | 硅基流动 SiliconFlow |
| `edge-tts` | 文字转语音（打电话） | 微软 Edge TTS（Python） |

---

## 1. 智能P图

**一句话**：你传一张图 + 写一句描述 → AI 帮你修图。

### 流程

```
用户选图 + 写"人像美颜"
    ↓
前端打包成 FormData → POST /create/smart-edit
    ↓
后端存图到硬盘 → 建一条数据库工单 → 返回 jobId
    ↓
后端异步调用 SiliconFlow API（Kolors 模型）
    ↓
AI 返回新图 → 存到 uploads/ → 更新数据库
    ↓
前端通过 SSE 收到结果 → 显示图片
```

### 核心代码

**前端发送请求**（`smartEditStore.ts`）：
```typescript
// 把图片和文字打包发给后端
const formData = new FormData();
formData.append('imageUrl', image);    // 用户选的图
formData.append('tool', 'beauty');     // 工具名：美颜
formData.append('prompt', '人像美颜');  // 用户写的描述

const response = await fetch('/create/smart-edit', { method: 'POST', body: formData });
const { jobId } = await response.json();  // 拿到工单号
```

**后端调 AI 生成**（`siliconflow.provider.ts`）：
```typescript
// 调用硅基流动 API，让 AI 根据 prompt 改图
const response = await fetch('https://api.siliconflow.cn/v1/images/generations', {
  body: JSON.stringify({
    model: 'Kwai-Kolors/Kolors',        // 快手的图生图模型
    prompt: '人像美颜, masterpiece, best quality...',  // 自动漫画质增强
    image: base64,                       // 原图的 base64 编码
    image_size: '512x512',
    num_inference_steps: 30,             // AI 思考 30 步
  })
});
```

**工具对应的默认 Prompt**（`smart-edit.service.ts`）：
```typescript
const prompts = {
  enhance: '高清修复，提升图片清晰度和细节',
  beauty:  '人像美颜，优化肤质，磨皮美白',
  remove:  '去除杂物，局部重绘，图像修复',
  beautify: '图片美化，优化光影色彩',
  expand:  '智能扩图，外绘扩展画面边界',
};
```

### 关键文件
- 前端：`rn-app/src/screens/SmartEditScreen.tsx`、`rn-app/src/stores/smartEditStore.ts`
- 后端：`nest-backend/src/create/smart-edit.service.ts`、`nest-backend/src/create/siliconflow.provider.ts`

---

## 2. 拍照答疑

**一句话**：拍一道题 → AI 看图 + 解题 → 逐步讲解。

### 流程

```
用户拍照/选图 → 上传到 /create/upload
    ↓
POST /chat/photo-solve { sessionId, imageUrl, content: "请解答这道题目" }
    ↓
后端把图片转成 base64 → 构造多模态消息
    ↓
调用通义千问视觉模型（qwen-vl-plus）→ 流式返回解题过程
    ↓
前端实时显示：题目解析 → 标准答案 → 详细步骤 → 知识点 → 易错提醒
```

### 核心代码

**构造多模态消息**（`chat.controller.ts`）：
```typescript
// 图片 + 文字一起发给视觉 AI
const userMessage = {
  role: 'user',
  content: [
    { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,...' } },  // 图片
    { type: 'text', text: '请解答这道题目' }                                  // 文字
  ]
};

// 调用视觉模型
yield* this.llmService.streamChatWithVision([
  { role: 'system', content: '你是专业全学科AI解题大师...' },
  userMessage
]);
```

**Prompt**（告诉 AI 怎么回答）：
```
你是专业全学科AI解题大师。请使用 Markdown 格式回答：
## 题目解析
## 标准答案
## 详细步骤
## 知识点总结
## 易错提醒
```

### 关键文件
- 前端：`rn-app/src/screens/ChatScreen.tsx`（拍照答疑集成在聊天页里）
- 后端：`nest-backend/src/chat/chat.controller.ts`（L153-252）

---

## 3. 作业批改

**一句话**：拍作业照片 → AI 逐题批改 → 给对错标记 + 详细解析。

### 与拍照答疑的区别

| | 拍照答疑 | 作业批改 |
|--|---------|---------|
| 入口 | 聊天页内 | 独立页面 |
| 上下文 | 有对话历史 | 一次性，无历史 |
| Prompt | 通用解题 | 专业教师批改格式 |
| 模型 | qwen-vl-plus | qwen-vl-plus（同一个） |

### 核心代码

**批改 Prompt**（`homework.service.ts`）：
```
你是一位经验丰富、认真负责的中小学教师。请对学生的作业进行专业批改。

#### 第 1 题
- **题目内容**：（从图片中识别）
- **学生答案**：（学生手写的）
- **批改结果**：✅ 正确 / ❌ 错误 / ⚠️ 部分正确
- **标准答案**：xxx
- **详细解析**：分步骤讲解
- **易错提醒**：常见错误

批改规则：
1. 严格判断对错，给出明确的 ✅❌⚠️ 标记
2. 解析要详细到每一步
3. 语气鼓励为主，先肯定再指出不足
```

### 关键文件
- 前端：`rn-app/src/screens/HomeworkGradeScreen.tsx`
- 后端：`nest-backend/src/homework/homework.service.ts`

---

## 4. AI生图

**一句话**：写一段描述 → AI 生成一张全新的图片。

### 流程

```
用户写"赛博朋克少女" + 选比例 16:9
    ↓
POST /create/ai-gen { userDescription, aspectRatio }
    ↓
Prompt 服务把中文描述翻译成英文绘图提示词
    ↓
调用 SiliconFlow API（Kolors 模型）→ 生成图片
    ↓
前端轮询 jobId → 拿到结果图
```

### 核心代码

**Prompt 翻译**（`prompt.service.ts`）：
```typescript
// 用户写的中文 → AI 翻译成英文绘图提示词
const prompt = `你是一位专业的AI绘图提示词工程师。
请根据以下信息生成高质量的图片生成提示词。
风格：${stylePrompt}
用户描述：${userDescription}
比例：${aspectRatio}
请输出英文提示词。`;
```

**自动漫质增强**（`siliconflow.provider.ts`）：
```typescript
// 自动在 prompt 后面追加画质关键词
const QUALITY_SUFFIX = ', masterpiece, best quality, ultra detailed, 8k resolution, photorealistic...';

private enhancePrompt(prompt: string): string {
  if (prompt.includes('masterpiece')) return prompt;  // 已有就不加
  return prompt + QUALITY_SUFFIX;
}
```

### 关键文件
- 前端：`rn-app/src/screens/AiImageGenScreen.tsx`、`rn-app/src/stores/aiImageGenStore.ts`
- 后端：`nest-backend/src/create/create.service.ts`、`nest-backend/src/llm/prompt.service.ts`

---

## 5. AI录音笔

**一句话**：录音 → 实时转文字 → AI 总结 + 深度分析。

### 流程

```
用户点"开始录音"
    ↓
前端 WebSocket 发送 PCM 音频流 → 后端转发给阿里云 NLS
    ↓
NLS 实时返回识别文字 → 前端实时显示（边录边出字）
    ↓
用户点"停止" → 拿到完整转写文本
    ↓
POST /recording/summary → AI 生成结构化总结
POST /recording/analysis → AI 深度分析
```

### 核心代码

**实时语音识别**（`recording.gateway.ts`）：
```typescript
// 连接阿里云 NLS 实时语音识别
const nlsSocket = new WebSocket('wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1', {
  headers: { 'X-NLS-Token': token }
});

// 发送开始识别指令
nlsSocket.send(JSON.stringify({
  header: { name: 'StartRecognition' },
  payload: { format: 'pcm', sample_rate: 16000, enable_intermediate_result: true }
}));

// 转发用户的音频数据给 NLS
nlsSocket.send(pcmBuffer);
```

**AI 总结 Prompt**（`recording.service.ts`）：
```
你是一个专业的会议记录和内容总结助手。
请生成结构化的总结报告：
1. 标题（一句话概括主题）
2. 正文段落
3. 小结（编号列表）
4. 要点（bullet list）
```

### 关键文件
- 前端：`rn-app/src/screens/RecordingScreen.tsx`
- 后端：`nest-backend/src/recording/recording.gateway.ts`、`nest-backend/src/recording/recording.service.ts`

---

## 6. AI写作

**一句话**：选类型 + 填主题 → AI 写一篇完整的文章。

### 支持的写作类型

| 类型 | 可选配置 |
|------|---------|
| 通用写作 | 平台（公众号/知乎）、风格（正式/幽默/古风...）、字数 |
| 小说 | 题材（玄幻/武侠/都市/言情...） |
| 作文 | 学段、体裁、语言 |
| 营销文案 | 类型（种草/推广/品牌故事）、风格、受众 |
| 公文 | 类别（通知/报告/请示...） |
| 朋友圈 | 格式（图文/纯文字）、风格（文艺/搞笑/治愈） |

### 核心代码

**动态 Prompt 构建**（`writing.service.ts`）：
```typescript
// 根据用户选的类型和配置，拼出不同的 prompt
buildPrompt(writingType, filters, topic) {
  let instructions = '';

  if (filters.style) {
    instructions += `风格：${STYLE_GUIDE[filters.style]}\n`;
    // STYLE_GUIDE = { '幽默': '轻松诙谐，善用比喻和反讽...', '古风': '文言文韵味...' }
  }
  if (filters.platform) {
    instructions += `平台：${PLATFORM_GUIDE[filters.platform]}\n`;
    // PLATFORM_GUIDE = { '公众号': '标题吸引人，开头设悬念...' }
  }

  return `你是一位专业的中文写作助手。围绕主题「${topic}」撰写内容。\n${instructions}`;
}
```

### 关键文件
- 前端：`rn-app/src/screens/AiWriteScreen.tsx`
- 后端：`nest-backend/src/writing/writing.service.ts`

---

## 7. 王者COS照

**一句话**：上传你的自拍 + 选一个王者荣耀英雄 → AI 把你的脸融合到英雄身上。

### 流程

```
用户选英雄（如貂蝉）→ 上传自拍照
    ↓
POST /create/cos { characterName: '貂蝉', referenceImageUrl: '...' }
    ↓
后端查 hero-prompts.ts 拿到貂蝉的专属 prompt
    ↓
调用 SiliconFlow API（Kolors img2img 模式）→ 人脸融合
    ↓
返回 COS 结果图
```

### 核心代码

**英雄 Prompt**（`hero-prompts.ts`）：
```typescript
const HERO_PROMPTS = {
  '貂蝉': {
    previewPrompt: '中国古代美女貂蝉，精致五官，飘逸长发，华丽汉服...',
    cosPrompt: 'cosplay王者荣耀貂蝉角色，融合用户面部特征...'
  },
  '孙悟空': {
    previewPrompt: 'Chinese mythology Sun Wukong, golden armor, powerful stance...',
    cosPrompt: 'cosplay as Sun Wukong, merge user face with character...'
  }
};
```

**生成逻辑**（`create.service.ts`）：
```typescript
// 有自拍 → 用 cosPrompt（人脸融合模式）
// 没自拍 → 用 previewPrompt（纯文生图，只生成英雄模板）
const prompt = referenceImageUrl ? hero.cosPrompt : hero.previewPrompt;

await this.imageGenProvider.generateImage(prompt, {
  referenceImageUrl: refImagePath,  // 用户的自拍
});
```

### 关键文件
- 前端：`rn-app/src/screens/CosScreen.tsx`、`rn-app/src/stores/cosStore.ts`
- 后端：`nest-backend/src/create/hero-prompts.ts`、`nest-backend/src/create/create.service.ts`

---

## 8. 打电话

**一句话**：跟 AI 语音实时对话 — 你说话它听懂，它说话你能听到。

### 流程（三条 WebSocket 连接同时工作）

```
① 客户端 ←→ 服务端（Socket.IO）：控制指令 + 音频传输
② 服务端 ←→ 阿里云 NLS（WebSocket）：语音识别
③ 服务端 → Python edge-tts（HTTP）：文字转语音
```

```
用户说话 → 前端采集 PCM 音频 → 发给服务端
    ↓
服务端转发给阿里云 NLS → 实时返回识别文字
    ↓
识别完整句子 → 发给 DeepSeek LLM → 流式返回文字
    ↓
每检测到一个完整句子 → 立即调 TTS 生成音频
    ↓
音频发给前端 → 边生成边播放（实时朗读）
```

### 核心代码

**实时语音识别**（`voice-call.gateway.ts`）：
```typescript
// 用户说话 → 转发到阿里云 NLS
handleAudioData(client, data) {
  const pcmBuffer = Buffer.from(data, 'base64');
  state.nlsSocket.send(pcmBuffer);  // 直接转发给 NLS
}
```

**LLM 流式回复 + 句子级 TTS**（`voice-call.gateway.ts`）：
```typescript
// LLM 每吐出一个 token，就发给前端显示
for await (const token of this.voiceCallService.streamChat(messages)) {
  client.emit('ai-text-chunk', { text: token });

  // 累积文字，检测完整句子
  sentenceBuffer += token;
  const { complete, remainder } = this.voiceCallService.splitIntoSentences(sentenceBuffer);

  // 每个完整句子立即开始 TTS（不等 LLM 说完）
  for (const sentence of complete) {
    ttsPromises.push(this.ttsAndSend(client, state, sentence));  // 并行生成音频
  }
}
```

**打断机制**：
```typescript
// 用户在 AI 说话时开口 → 检测到新语音 ≥4 个字符 → 打断 AI
if (state.isAiSpeaking && text.length >= 4 && isNewSpeech) {
  state.isInterrupted = true;
  client.emit('ai-interrupted');  // 通知前端停止播放
}
```

### 关键文件
- 前端：`rn-app/src/screens/VoiceCallScreen.tsx`、`rn-app/src/services/voiceCallSocket.ts`
- 后端：`nest-backend/src/voice-call/voice-call.gateway.ts`、`nest-backend/tts_server.py`

---

## 9. AI生视频

**一句话**：写一段描述（或传一张图）→ AI 生成一段视频。

### 流程

```
用户写"海边日落" + 选分辨率 16:9
    ↓
POST /video/generate { prompt, resolution: '1280x720' }
    ↓
后端调用 SiliconFlow API（Wan2.2 模型）
    ↓
SiliconFlow 异步处理（3-6 分钟）
    ↓
后端每 3 秒轮询一次状态 → 下载完成的视频
    ↓
前端通过 WebSocket 收到进度更新 → 显示视频
```

### 核心代码

**提交视频生成任务**（`siliconflow-video.ts`）：
```typescript
// 文字生视频用 Wan2.2-T2V，图片生视频用 Wan2.2-I2V
const model = inputImageUrl
  ? 'Wan-AI/Wan2.2-I2V-A14B'   // 图生视频
  : 'Wan-AI/Wan2.2-T2V-A14B';  // 文生视频

const response = await fetch('https://api.siliconflow.cn/v1/video/submit', {
  body: JSON.stringify({
    model,
    prompt,
    image: base64,  // 仅 img2vid 模式
    image_size: '1280x720',
    num_frames: 120,
    fps: 24,
  })
});
```

### 关键文件
- 前端：`rn-app/src/screens/AiVideoGenScreen.tsx`、`rn-app/src/stores/aiVideoGenStore.ts`
- 后端：`nest-backend/src/video/video.service.ts`、`nest-backend/src/video/siliconflow-video.ts`

---

## 10. 文档阅读

**一句话**：上传 PDF/TXT → AI 拆分、向量化、生成摘要 → 你可以针对文档内容提问。

### 流程

```
用户上传 PDF
    ↓
解析 PDF 文本 → 按 512 token 切块（重叠 128 token）
    ↓
每块文本 → BAAI/bge-m3 模型 → 生成向量 → 存入 ChromaDB
    ↓
同时生成 3 种摘要：执行摘要 + 关键要点 + 大纲
    ↓
用户提问 → 问题向量化 → 在 ChromaDB 中检索最相关的 5 个文本块
    ↓
把文本块 + 问题一起发给 LLM → 流式回答（带引用标注 [1][2]）
```

### 核心代码

**文本切块**（`doc-chunker.service.ts`）：
```typescript
// 把长文档切成小块，每块 512 token，重叠 128 token
const CHUNK_SIZE = 512;
const OVERLAP = 128;
const separators = ['\n\n', '\n', '。', '；', '，', ' '];

// 按分隔符切分，长段落在合适的位置断开
// 前后块有 128 token 的重叠，防止上下文丢失
```

**向量化存储**（`doc-embedding.service.ts`）：
```typescript
// 每个文档一个 ChromaDB collection
const collection = await chroma.getOrCreateCollection({
  name: `doc_reader_${docId}`,
  embeddingFunction: new SiliconFlowEmbedding({ model: 'BAAI/bge-m3' })
});

await collection.add({ documents: chunks, ids, metadatas });
```

**RAG 问答**（`doc-qa.service.ts`）：
```typescript
// 1. 问题向量化 → 检索最相关的 5 个文本块
const results = await collection.query({ queryTexts: [question], nResults: 5 });

// 2. 把文本块 + 问题发给 LLM
const prompt = `你是文档阅读助手。请基于以下文档内容回答：
【文档片段】${contextText}
使用 [数字] 标注引用来源，如 [1] [2]`;
```

### 关键文件
- 前端：`rn-app/src/screens/doc-reader/DocReaderScreen.tsx`
- 后端：`nest-backend/src/doc-reader/services/doc.service.ts`、`doc-chunker.service.ts`、`doc-embedding.service.ts`、`doc-qa.service.ts`

---

## 11. AI出卷

**一句话**：上传试卷照片（或写描述）→ AI 识别题目 → 生成相似卷 / 巩固卷 / 自定义卷。

### 三种模式

| 模式 | 输入 | 输出 |
|------|------|------|
| 相似卷 | 试卷照片 | 覆盖相同知识点的新题目 |
| 错题巩固卷 | 错题照片 | 针对薄弱点的强化练习 |
| 自定义试卷 | 文字描述（如"高中英语阅读理解"） | 按描述生成的完整试卷 |

### 核心代码

**试卷识别**（`exam.service.ts`）：
```typescript
// 先用视觉模型识别图片中的所有题目
const prompt = `你是专业的试卷识别助手。请识别图片中的所有题目，返回 JSON：
{
  "subject": "学科",
  "grade": "年级",
  "questions": [
    { "type": "选择题", "content": "题目文本", "options": ["A. xxx", "B. xxx"] }
  ]
}`;

// 调用视觉模型
const result = await this.llmService.streamChatWithVision([
  { role: 'user', content: [{ type: 'image_url', ... }, { type: 'text', text: prompt }] }
]);
```

**自定义试卷的智能解析**（`exam.service.ts`）：
```typescript
// 用户只写了描述时，让 AI 自己从描述中提取所有信息
if (hasStructuredFields) {
  // 有明确的学科/年级 → 直接用
  prompt = `学科：${subject}，年级：${grade}，题型：${questionTypes}...`;
} else {
  // 只有描述 → 让 AI 自己分析
  prompt = `【用户需求】${description}
  请先分析用户需求，提取学科、年级、题型、数量等信息，然后生成试卷。`;
}
```

### 关键文件
- 前端：`rn-app/src/screens/AiExamScreen.tsx`
- 后端：`nest-backend/src/exam/exam.service.ts`

---

## 12. 知识库

**一句话**：上传文档到知识库 → 聊天时开启"引用知识库"→ AI 基于你的文档回答问题。

### 流程

```
用户上传 TXT/PDF → 保存到数据库 + 向量化存入 ChromaDB
    ↓
用户聊天时开启"引用知识库"
    ↓
用户问题 → 向量化 → 在 ChromaDB 中检索相关文档片段
    ↓
把文档片段注入到 LLM 的 system message 中
    ↓
LLM 基于文档内容回答
```

### 核心代码

**上传文档**（`knowledge.service.ts`）：
```typescript
async addDocument(title, content) {
  // 1. 保存到数据库
  await this.prisma.knowledgeDoc.create({ data: { title, content } });

  // 2. 切块 + 向量化存入 ChromaDB
  await this.ragService.addDocument(doc.id, content);
}
```

**RAG 检索 + 注入**（`rag.service.ts`）：
```typescript
// 从 ChromaDB 检索相关文档
async queryDocuments(query: string, topK = 5) {
  const results = await collection.query({ queryTexts: [query], nResults: topK });
  return results.documents.join('\n\n');  // 拼接成上下文
}

// 在聊天时注入到 system message
if (enableRag) {
  const ragContext = await this.ragService.queryDocuments(content);
  messages.unshift({ role: 'system', content: `【知识库内容】\n${ragContext}` });
}
```

### 关键文件
- 前端：`rn-app/src/screens/KnowledgeScreen.tsx`
- 后端：`nest-backend/src/knowledge/knowledge.service.ts`、`nest-backend/src/llm/rag.service.ts`

---

## 13. 深度思考

**一句话**：开启后 AI 会先"想清楚"再回答 — 先输出思考过程，再给最终答案。

### 核心代码

**Prompt 设计**（`chat.service.ts`）：
```typescript
// 开启深度思考时，注入这个 system message
const deepThinkingPrompt = `你是一个具备深度思考能力的AI助手。请严格按两阶段回复：

【第一阶段：深度思考分析】
1. 明确问题核心需求与隐藏条件
2. 拆解问题结构，分模块逐一分析
3. 考虑所有边界情况、漏洞、风险
4. 梳理完整逻辑链，反复校验合理性
只写思考逻辑，不给出答案。

【第二阶段：最终答案】
思考完毕后，标注"【最终答案】"，仅输出精简的最终答案。`;
```

**前端解析**（`ChatScreen.tsx`）：
```typescript
// 前端根据标记分段显示
if (text.includes('【深度思考分析】')) {
  // 显示思考过程（带特殊样式）
  setThinkingContent(thinkingPart);
}
if (text.includes('【最终答案】')) {
  // 只显示最终答案部分
  setDisplayContent(answerPart);
}
```

### 关键文件
- 前端：`rn-app/src/screens/ChatScreen.tsx`（L371-394）
- 后端：`nest-backend/src/chat/chat.service.ts`（L125-143）

---

## 14. 联网搜索

**一句话**：开启后 AI 会先搜索互联网，再基于搜索结果回答你的问题。

### 流程

```
用户问"今天有什么新闻"
    ↓
后端用问题去百度/Tavily/SerpAPI 搜索
    ↓
拿到搜索结果（标题 + 摘要 + 链接）
    ↓
把搜索结果注入到 LLM 的 context 中
    ↓
LLM 基于搜索结果 + 自身知识回答
```

### 核心代码

**搜索服务**（`web-search.service.ts`）：
```typescript
// 三级降级：Tavily → SerpAPI → 百度（免费兜底）
async search(query: string) {
  if (this.tavilyKey) {
    return await this.searchTavily(query);   // 优先用 Tavily
  }
  if (this.serpKey) {
    return await this.searchSerp(query);     // 其次用 SerpAPI
  }
  return await this.searchBaidu(query);      // 免费兜底：爬百度
}

// 百度搜索：爬 HTML 解析结果
private async searchBaidu(query: string) {
  const html = await fetch(`https://www.baidu.com/s?wd=${encodeURIComponent(query)}`);
  // 正则提取 <h3> 标题 + 链接 + 摘要
}
```

**注入到聊天上下文**（`chat.service.ts`）：
```typescript
if (webSearch) {
  const results = await this.webSearchService.search(content);
  messages.splice(1, 0, {
    role: 'system',
    content: `【联网搜索结果】\n${results}\n请基于以上搜索结果回答。`
  });
}
```

### 关键文件
- 前端：`rn-app/src/screens/ChatScreen.tsx`（联网搜索按钮）
- 后端：`nest-backend/src/web-search/web-search.service.ts`、`nest-backend/src/chat/chat.service.ts`

---

## 总结：所有功能的共性模式

不管哪个功能，底层都是同一个套路：

```
用户输入 → 后端构造 Prompt → 调 AI 模型 → 流式返回 → 前端显示
```

区别只在于：
| | 输入 | AI 模型 | 输出 |
|--|------|---------|------|
| 聊天/写作/出卷 | 文字 | DeepSeek 文本模型 | 文字 |
| 拍照答疑/批改 | 图片+文字 | 通义千问视觉模型 | 文字 |
| 生图/P图/COS | 文字/图片 | Kolors 图片模型 | 图片 |
| 生视频 | 文字/图片 | Wan2.2 视频模型 | 视频 |
| 录音笔 | 音频 | NLS 语音识别 + qwen-plus | 文字总结 |
| 打电话 | 语音 | NLS + DeepSeek + edge-tts | 语音 |
| 知识库/文档阅读 | 文档 | BAAI/bge-m3 向量化 + DeepSeek | 基于文档的回答 |
| 深度思考 | 文字 | DeepSeek（特殊 prompt） | 思考过程+答案 |
| 联网搜索 | 文字 | 百度/Tavily + DeepSeek | 基于搜索的回答 |
