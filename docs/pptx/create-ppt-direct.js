const pptxgen = require('pptxgenjs');
const path = require('path');

const OUTPUT = path.join(__dirname, 'YuanBaoAI-项目答辩.pptx');

// 颜色主题
const C = {
  primary: '7c6aef',
  dark: '1a1a2e',
  darkBlue: '16213e',
  accent: 'a78bfa',
  text: '333333',
  muted: '666666',
  light: 'f8f9fa',
  white: 'ffffff',
  border: 'e5e7eb',
};

async function create() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'YuanBaoAI';
  pptx.title = 'YuanBaoAI 项目答辩';

  // ═══ Slide 1: Title ═══
  {
    const slide = pptx.addSlide();
    slide.background = { color: C.dark };
    // Left accent bar
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 1.8, w: 0.8, h: 0.06, fill: { color: C.primary } });
    // Title
    slide.addText('YuanBaoAI', { x: 0.8, y: 2.0, w: 5, h: 0.8, fontSize: 36, fontFace: 'Arial', color: C.white, bold: true });
    slide.addText('仿腾讯元宝 AI 对话 APP', { x: 0.8, y: 2.8, w: 5, h: 0.5, fontSize: 18, fontFace: 'Arial', color: C.accent, bold: true });
    slide.addText('React Native + NestJS + Python 三端架构', { x: 0.8, y: 3.5, w: 5, h: 0.4, fontSize: 13, fontFace: 'Arial', color: '888888' });
    slide.addText('项目答辩', { x: 0.8, y: 4.0, w: 5, h: 0.3, fontSize: 11, fontFace: 'Arial', color: '666666' });
    // Right circle
    slide.addShape(pptx.shapes.OVAL, { x: 6.5, y: 1.5, w: 2.5, h: 2.5, fill: { color: '1e1e3f' }, line: { color: '333366', width: 2 } });
    slide.addText('🤖', { x: 6.5, y: 1.5, w: 2.5, h: 2.5, fontSize: 60, align: 'center', valign: 'middle' });
  }

  // ═══ Slide 2: Overview ═══
  {
    const slide = pptx.addSlide();
    slide.background = { color: C.light };
    // Header bar
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.9, fill: { color: C.white } });
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.6, y: 0.3, w: 0.5, h: 0.05, fill: { color: C.primary } });
    slide.addText('项目概述', { x: 0.6, y: 0.4, w: 4, h: 0.4, fontSize: 22, fontFace: 'Arial', color: C.dark, bold: true });

    // Left column - cards
    const cards = [
      { title: '项目定位', desc: '仿腾讯元宝的 AI 对话 APP，集成 14+ 功能模块，覆盖 AI 对话、图像创作、教育工具、多媒体、效率工具五大领域。' },
      { title: '技术栈', desc: 'React Native · NestJS · TypeScript · PostgreSQL · ChromaDB · LangChain · Stable Diffusion' },
      { title: '核心能力', desc: 'AI 对话、角色扮演、图像生成/编辑、教育辅导、语音交互、知识库管理、联网搜索' },
    ];
    cards.forEach((c, i) => {
      const y = 1.2 + i * 1.15;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.5, y, w: 4.2, h: 1.0, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.1 });
      slide.addText(c.title, { x: 0.7, y: y + 0.1, w: 3.8, h: 0.3, fontSize: 12, fontFace: 'Arial', color: C.primary, bold: true });
      slide.addText(c.desc, { x: 0.7, y: y + 0.4, w: 3.8, h: 0.5, fontSize: 10, fontFace: 'Arial', color: C.text });
    });

    // Right column - architecture
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 5.2, y: 1.2, w: 4.3, h: 3.6, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.1 });
    slide.addText('三端架构', { x: 5.4, y: 1.3, w: 3.9, h: 0.35, fontSize: 13, fontFace: 'Arial', color: C.primary, bold: true });

    const archItems = [
      { label: '前端 - React Native (Expo Web)', detail: '25 个页面 | 14 个功能入口 | Zustand' },
      { label: '后端 - NestJS', detail: '22 个模块 | 60+ API | SSE 流式通信' },
      { label: 'AI 服务 - Python FastAPI', detail: 'Stable Diffusion | PaddleOCR | DashScope ASR' },
    ];
    archItems.forEach((item, i) => {
      const y = 1.8 + i * 1.0;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 5.4, y, w: 3.9, h: 0.85, fill: { color: C.light }, rectRadius: 0.08 });
      slide.addText(item.label, { x: 5.6, y: y + 0.08, w: 3.5, h: 0.3, fontSize: 11, fontFace: 'Arial', color: C.dark, bold: true });
      slide.addText(item.detail, { x: 5.6, y: y + 0.4, w: 3.5, h: 0.3, fontSize: 9, fontFace: 'Arial', color: C.muted });
    });
  }

  // ═══ Slide 3: AI Chat ═══
  {
    const slide = pptx.addSlide();
    slide.background = { color: C.light };
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.9, fill: { color: C.white } });
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.6, y: 0.3, w: 0.5, h: 0.05, fill: { color: C.primary } });
    slide.addText('AI 核心对话能力', { x: 0.6, y: 0.4, w: 5, h: 0.4, fontSize: 22, fontFace: 'Arial', color: C.dark, bold: true });

    const features = [
      { title: '智能对话 + SSE 流式', desc: '支持 DeepSeek/通义千问多模型切换，fetch+ReadableStream 实现 POST SSE，逐字打字效果' },
      { title: '角色人设系统', desc: '20+ 预设角色，每个角色独立 system prompt，对话时自动注入角色指令' },
      { title: '深度思考模式', desc: '两阶段思考链：先「深度思考分析」再「最终答案」，前端动态渲染' },
      { title: '联网搜索', desc: '百度搜索实时检索，搜索结果注入 LLM 上下文，回答附带「已联网检索」标记' },
      { title: 'RAG 知识库', desc: '上传文档→ChromaDB 向量检索→聊天时自动引用，支持多文档管理' },
      { title: 'LangChain 多级记忆', desc: '内存/Redis/PostgreSQL 三种方案，环境变量切换，消息双写策略' },
    ];

    features.forEach((f, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 0.5 + col * 4.7;
      const y = 1.2 + row * 1.2;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y, w: 4.4, h: 1.05, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.1 });
      slide.addText(f.title, { x: x + 0.2, y: y + 0.08, w: 4.0, h: 0.3, fontSize: 11, fontFace: 'Arial', color: C.primary, bold: true });
      slide.addText(f.desc, { x: x + 0.2, y: y + 0.4, w: 4.0, h: 0.55, fontSize: 9, fontFace: 'Arial', color: C.text });
    });
  }

  // ═══ Slide 4: Image Creation ═══
  {
    const slide = pptx.addSlide();
    slide.background = { color: C.light };
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.9, fill: { color: C.white } });
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.6, y: 0.3, w: 0.5, h: 0.05, fill: { color: C.primary } });
    slide.addText('AI 图像创作', { x: 0.6, y: 0.4, w: 5, h: 0.4, fontSize: 22, fontFace: 'Arial', color: C.dark, bold: true });

    const imgFeatures = [
      { title: 'AI 生图 (Stable Diffusion)', desc: '本地 SD 1.5 推理，适配 4GB 显存。float16 + attention slicing 优化。\n前端→POST /create/ai-gen→Python Service→SD img2img→1\n每步回调进度→返回图片' },
      { title: '智能 P 图', desc: '6 种编辑功能：扩图、变清晰、人像美颜、去除杂物、图片美化、风格迁移。复用 SD img2img 管线。' },
      { title: '王者 COS 照', desc: '人脸融合技术，5 个英雄角色，实时预览。用户上传人脸+选择英雄→SD 生成 COS 照。' },
      { title: '图生图', desc: '基于参考图+Prompt 的图像变换，支持自定义风格和参数调节。' },
    ];

    imgFeatures.forEach((f, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 0.5 + col * 4.7;
      const y = 1.2 + row * 1.7;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y, w: 4.4, h: 1.5, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.1 });
      slide.addText(f.title, { x: x + 0.2, y: y + 0.1, w: 4.0, h: 0.3, fontSize: 12, fontFace: 'Arial', color: C.primary, bold: true });
      slide.addText(f.desc, { x: x + 0.2, y: y + 0.45, w: 4.0, h: 0.95, fontSize: 9, fontFace: 'Arial', color: C.text });
    });
  }

  // ═══ Slide 5: Education ═══
  {
    const slide = pptx.addSlide();
    slide.background = { color: C.light };
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.9, fill: { color: C.white } });
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.6, y: 0.3, w: 0.5, h: 0.05, fill: { color: C.primary } });
    slide.addText('AI 教育工具', { x: 0.6, y: 0.4, w: 5, h: 0.4, fontSize: 22, fontFace: 'Arial', color: C.dark, bold: true });

    const eduFeatures = [
      { title: '拍题答疑', desc: 'DashScope 视觉模型端到端识别+解题\nqwen-vl-plus 一次调用完成识别+解题', highlight: '技术亮点：视觉大模型端到端处理' },
      { title: '作业批改', desc: '视觉模型识别手写答案，逐题批改\n输出：总体评价→逐题批改→知识点→建议' },
      { title: 'AI 出卷', desc: '三种模式：相似卷/错题巩固卷/自定义试卷\n视觉模型识别题目JSON→LLM生成→SSE流式', highlight: '流程：识别→生成→流式返回' },
      { title: '文档阅读 (RAG)', desc: 'PDF/TXT→分块(512字符)→ChromaDB向量化\n→AI摘要(执行摘要+要点+大纲)→文档问答' },
    ];

    eduFeatures.forEach((f, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 0.5 + col * 4.7;
      const y = 1.2 + row * 1.7;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y, w: 4.4, h: 1.5, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.1 });
      slide.addText(f.title, { x: x + 0.2, y: y + 0.1, w: 4.0, h: 0.3, fontSize: 12, fontFace: 'Arial', color: C.primary, bold: true });
      slide.addText(f.desc, { x: x + 0.2, y: y + 0.45, w: 4.0, h: 0.6, fontSize: 9, fontFace: 'Arial', color: C.text });
      if (f.highlight) {
        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: x + 0.2, y: y + 1.1, w: 4.0, h: 0.3, fill: { color: 'fef3c7' }, rectRadius: 0.05 });
        slide.addText(f.highlight, { x: x + 0.35, y: y + 1.12, w: 3.7, h: 0.26, fontSize: 8, fontFace: 'Arial', color: '92400e' });
      }
    });
  }

  // ═══ Slide 6: Multimedia ═══
  {
    const slide = pptx.addSlide();
    slide.background = { color: C.light };
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.9, fill: { color: C.white } });
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.6, y: 0.3, w: 0.5, h: 0.05, fill: { color: C.primary } });
    slide.addText('AI 多媒体 & 效率工具', { x: 0.6, y: 0.4, w: 6, h: 0.4, fontSize: 22, fontFace: 'Arial', color: C.dark, bold: true });

    const mmFeatures = [
      { title: 'AI 录音笔', desc: '实时语音转写(DashScope ASR)+AI总结+AI分析\nSocket.IO 双向通信实现流式转写' },
      { title: 'AI 语音通话', desc: '沉浸式语音对话，TTS 实时语音合成\nASR→LLM→TTS 全链路' },
      { title: '语音输入', desc: 'MediaRecorder录音→后端DashScope ASR识别\n→文字填入输入框' },
      { title: 'AI 生视频', desc: '文本/图片生成视频，支持多种风格\n调用外部API，异步生成+轮询进度' },
      { title: 'AI 写作', desc: '全体裁写作（作文、周报、文案等）\n多风格模板，SSE流式生成' },
      { title: '翻译', desc: '多语言互译+拍照翻译（OCR+翻译）\n支持实时流式翻译结果' },
    ];

    mmFeatures.forEach((f, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 0.4 + col * 3.15;
      const y = 1.2 + row * 1.7;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.95, h: 1.5, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.1 });
      slide.addText(f.title, { x: x + 0.15, y: y + 0.1, w: 2.65, h: 0.3, fontSize: 11, fontFace: 'Arial', color: C.primary, bold: true });
      slide.addText(f.desc, { x: x + 0.15, y: y + 0.45, w: 2.65, h: 0.95, fontSize: 9, fontFace: 'Arial', color: C.text });
    });
  }

  // ═══ Slide 7: Architecture ═══
  {
    const slide = pptx.addSlide();
    slide.background = { color: C.light };
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.9, fill: { color: C.white } });
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.6, y: 0.3, w: 0.5, h: 0.05, fill: { color: C.primary } });
    slide.addText('技术架构亮点', { x: 0.6, y: 0.4, w: 5, h: 0.4, fontSize: 22, fontFace: 'Arial', color: C.dark, bold: true });

    const techItems = [
      { title: 'SSE 流式通信', desc: '自定义 fetch+ReadableStream 实现 POST SSE，支持取消、错误处理、跨帧粘包解析' },
      { title: '向量检索 RAG', desc: 'ChromaDB+SiliconFlow Embedding，文档/试卷/对话多场景复用，语义搜索 top-5' },
      { title: '多模型适配', desc: '统一 LlmService 抽象层，支持 DeepSeek、通义千问、DashScope Vision，切换零成本' },
      { title: '记忆系统', desc: 'LangChain Memory 工厂模式，内存/Redis/PostgreSQL 三种方案，环境变量切换' },
      { title: '实时通信', desc: 'Socket.IO 双向通信，录音笔/语音通话实时转写、进度回调' },
      { title: '权限与安全', desc: 'JWT 认证，@UseGuards(JwtAuthGuard) 接口级权限，文件上传大小限制' },
    ];

    techItems.forEach((t, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 0.5 + col * 4.7;
      const y = 1.2 + row * 1.2;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y, w: 4.4, h: 1.05, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.1 });
      slide.addText(t.title, { x: x + 0.2, y: y + 0.08, w: 4.0, h: 0.3, fontSize: 11, fontFace: 'Arial', color: C.primary, bold: true });
      slide.addText(t.desc, { x: x + 0.2, y: y + 0.4, w: 4.0, h: 0.55, fontSize: 9, fontFace: 'Arial', color: C.text });
    });
  }

  // ═══ Slide 8: Stats ═══
  {
    const slide = pptx.addSlide();
    slide.background = { color: C.light };
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.9, fill: { color: C.white } });
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.6, y: 0.3, w: 0.5, h: 0.05, fill: { color: C.primary } });
    slide.addText('功能数据统计', { x: 0.6, y: 0.4, w: 5, h: 0.4, fontSize: 22, fontFace: 'Arial', color: C.dark, bold: true });

    // Stats cards
    const stats = [
      { num: '25', label: '前端页面' },
      { num: '22', label: '后端模块' },
      { num: '14', label: '功能入口' },
      { num: '60+', label: 'API 端点' },
      { num: '4', label: 'AI 模型' },
    ];
    stats.forEach((s, i) => {
      const x = 0.4 + i * 1.88;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y: 1.2, w: 1.7, h: 1.3, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.1 });
      slide.addText(s.num, { x, y: 1.3, w: 1.7, h: 0.7, fontSize: 30, fontFace: 'Arial', color: C.primary, bold: true, align: 'center' });
      slide.addText(s.label, { x, y: 2.05, w: 1.7, h: 0.3, fontSize: 11, fontFace: 'Arial', color: C.muted, align: 'center' });
    });

    // Detail cards
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 2.8, w: 4.3, h: 2.0, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.1 });
    slide.addText('功能分类', { x: 0.7, y: 2.9, w: 3.9, h: 0.3, fontSize: 12, fontFace: 'Arial', color: C.primary, bold: true });
    const funcItems = ['AI 对话：智能对话、角色人设、深度思考、联网搜索、知识库', '图像创作：AI 生图、智能 P 图、王者 COS、图生图', '教育工具：拍题答疑、作业批改、AI 出卷、文档阅读', '多媒体：录音笔、语音通话、视频生成、语音输入', '效率工具：AI 写作、翻译'];
    funcItems.forEach((item, i) => {
      slide.addText(item, { x: 0.7, y: 3.25 + i * 0.3, w: 3.9, h: 0.28, fontSize: 9, fontFace: 'Arial', color: C.text });
    });

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 5.2, y: 2.8, w: 4.3, h: 2.0, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.1 });
    slide.addText('技术覆盖', { x: 5.4, y: 2.9, w: 3.9, h: 0.3, fontSize: 12, fontFace: 'Arial', color: C.primary, bold: true });
    const techCover = ['前端：React Native (Expo Web) + TypeScript + Zustand', '后端：NestJS + Prisma ORM + JWT 认证', 'AI：DeepSeek / 通义千问 / DashScope VL / ASR', '向量：ChromaDB + SiliconFlow Embedding', '图像：Stable Diffusion 1.5 (本地推理)', 'OCR：PaddleOCR (本地部署)'];
    techCover.forEach((item, i) => {
      slide.addText(item, { x: 5.4, y: 3.25 + i * 0.27, w: 3.9, h: 0.25, fontSize: 9, fontFace: 'Arial', color: C.text });
    });
  }

  // ═══ Slide 9: Summary ═══
  {
    const slide = pptx.addSlide();
    slide.background = { color: C.dark };
    slide.addShape(pptx.shapes.RECTANGLE, { x: 4.2, y: 1.6, w: 0.8, h: 0.06, fill: { color: C.primary } });
    slide.addText('总结与展望', { x: 1, y: 1.8, w: 8, h: 0.7, fontSize: 28, fontFace: 'Arial', color: C.white, bold: true, align: 'center' });
    slide.addText('YuanBaoAI 实现了仿腾讯元宝的完整 AI 对话 APP\n覆盖 5 大领域、14+ 功能模块、60+ API 接口', { x: 1, y: 2.5, w: 8, h: 0.7, fontSize: 13, fontFace: 'Arial', color: '888888', align: 'center' });

    // Summary cards
    const sumCards = [
      { icon: '💬', title: 'AI 对话', sub: '多模型·角色·搜索' },
      { icon: '🎨', title: '图像创作', sub: '生图·P图·COS' },
      { icon: '📚', title: '教育工具', sub: '答疑·批改·出卷' },
      { icon: '🎬', title: '多媒体', sub: '录音·通话·视频' },
      { icon: '⚡', title: '效率工具', sub: '写作·翻译' },
    ];
    sumCards.forEach((c, i) => {
      const x = 0.8 + i * 1.8;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y: 3.5, w: 1.55, h: 1.2, fill: { color: '1e1e3f' }, line: { color: '333366', width: 1 }, rectRadius: 0.1 });
      slide.addText(c.icon, { x, y: 3.55, w: 1.55, h: 0.5, fontSize: 22, align: 'center' });
      slide.addText(c.title, { x, y: 4.05, w: 1.55, h: 0.25, fontSize: 11, fontFace: 'Arial', color: C.white, bold: true, align: 'center' });
      slide.addText(c.sub, { x, y: 4.3, w: 1.55, h: 0.2, fontSize: 8, fontFace: 'Arial', color: '888888', align: 'center' });
    });

    slide.addText('谢谢！', { x: 1, y: 4.9, w: 8, h: 0.4, fontSize: 12, fontFace: 'Arial', color: '666666', align: 'center' });
  }

  await pptx.writeFile({ fileName: OUTPUT });
  console.log(`Presentation saved to: ${OUTPUT}`);
}

create().catch(console.error);
