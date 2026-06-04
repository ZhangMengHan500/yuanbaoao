# 元宝AI 项目技术栈

## 前端

| 技术 | 用途 |
|------|------|
| React Native | 跨平台移动端框架（iOS / Android / Web） |
| Expo | RN 开发工具链（构建、调试、发布） |
| Zustand | 轻量级状态管理 |
| Socket.IO Client | WebSocket 实时通信（打电话、录音） |
| expo-image-picker | 图片选择与拍照 |
| expo-media-library | 保存图片到相册 |

## 后端

| 技术 | 用途 |
|------|------|
| NestJS | Node.js 后端框架（模块化、依赖注入） |
| Prisma | 数据库 ORM（类型安全） |
| PostgreSQL | 主数据库（用户、会话、消息、任务记录） |
| Redis | 缓存 + 实时进度存储 |
| Socket.IO | WebSocket 服务端（打电话、录音、视频进度） |
| LangChain | LLM 编排框架（统一调用多个 AI 模型） |

## AI 模型

| 技术 | 用途 |
|------|------|
| DeepSeek API | 文本对话（聊天、写作、出卷、深度思考） |
| 通义千问 qwen-vl-plus | 视觉理解（拍照答疑、作业批改、试卷识别） |
| 通义千问 qwen-plus | 文本生成（录音总结、分析） |
| Kwai-Kolors | 图片生成（AI生图、智能P图、COS照） |
| Wan2.2 | 视频生成（AI生视频） |
| BAAI/bge-m3 | 文本向量化（知识库、文档阅读语义检索） |
| Edge TTS | 文字转语音（打电话语音合成） |
| 阿里云 NLS | 语音识别（打电话、录音笔实时转文字） |

## 外部服务

| 技术 | 用途 |
|------|------|
| 硅基流动 SiliconFlow | 图片/视频/向量化 API 推理平台 |
| 阿里云 DashScope | 视觉模型 + ASR + TTS 入口 |
| ChromaDB | 向量数据库（知识库、文档阅读语义检索） |

## Python 微服务

| 技术 | 用途 |
|------|------|
| Flask + PaddleOCR | 图片文字识别（OCR 微服务） |
| FastAPI + Stable Diffusion | 本地 GPU 图片推理（img2img 微服务） |
| edge-tts | 文字转语音（打电话 TTS 引擎） |

## 数据库设计

| 数据库 | 表 |
|--------|-----|
| PostgreSQL | User, Session, Message, ImageJob, VideoJob, KnowledgeDoc, Template, CosHero |
| ChromaDB | yuanbao_knowledge（知识库）、doc_reader_{docId}（文档阅读） |
| Redis | smart-edit:progress:{jobId}、会话状态缓存 |

## 通信协议

| 协议 | 场景 |
|------|------|
| HTTP SSE | 聊天流式输出、写作、出卷、作业批改、拍照答疑 |
| WebSocket (Socket.IO) | 打电话、录音、视频进度推送 |
| HTTP REST | 图片上传、任务提交、知识库管理 |
