import { PrismaClient } from '@prisma/client';

// 数据库种子脚本 - 初始化默认角色人设
const prisma = new PrismaClient();

async function main() {
  // 创建默认 AI 助手角色
  const defaultPersona = await prisma.persona.upsert({
    where: { id: 'default-persona' },
    update: {},
    create: {
      id: 'default-persona',
      name: '元宝AI助手',
      description: '通用AI助手，可以回答各种问题',
      systemPrompt:
        '你是元宝AI助手，一个友好、专业、乐于助人的AI。请用简洁清晰的方式回答问题，适当使用emoji让对话更生动。',
      avatar: '🤖',
      isDefault: true,
    },
  });

  // 创建英语老师角色
  const englishTeacher = await prisma.persona.upsert({
    where: { id: 'english-teacher' },
    update: {},
    create: {
      id: 'english-teacher',
      name: '英语老师',
      description: '专业的英语学习助手，帮你练习口语和写作',
      systemPrompt:
        '你是一位专业的英语老师。用户会用中文或英文与你对话，你应该：1.纠正语法错误并解释原因；2.提供更地道的表达方式；3.适时用英文回复帮助用户练习。保持耐心和鼓励的态度。',
      avatar: '👩‍🏫',
      isDefault: false,
    },
  });

  // 创建编程助手角色
  const codeHelper = await prisma.persona.upsert({
    where: { id: 'code-helper' },
    update: {},
    create: {
      id: 'code-helper',
      name: '编程助手',
      description: '全栈开发助手，帮你解决编程问题',
      systemPrompt:
        '你是一位全栈开发专家。用户会向你询问编程问题，你应该：1.提供清晰的代码示例；2.解释代码原理；3.指出潜在的bug和优化建议。使用markdown代码块格式化代码。',
      avatar: '👨‍💻',
      isDefault: false,
    },
  });

  // ====== 创作模板种子数据 ======
  const templateData = [
    // 写真类
    {
      id: 'tpl-jp-portrait',
      name: '日系清新写真',
      category: '写真',
      description: '日系小清新风格写真，柔和自然光',
      stylePrompt: 'Japanese fresh portrait, soft natural lighting, film grain, pastel tones, cherry blossom background, bokeh',
      previewUrl: 'https://placehold.co/400x500/1e1b4b/7c6aef?text=%E6%97%A5%E7%B3%BB%E5%86%99%E7%9C%9F',
      hasOriginal: true,
      sortOrder: 100,
    },
    {
      id: 'tpl-cyberpunk',
      name: '赛博朋克风',
      category: '写真',
      description: '霓虹灯下的未来都市风格',
      stylePrompt: 'Cyberpunk style, neon lights, rainy city night, holographic elements, futuristic fashion, high contrast',
      previewUrl: 'https://placehold.co/400x500/172554/f97316?text=%E8%B5%9B%E5%8D%9A%E6%9C%8B%E5%85%8B',
      hasOriginal: true,
      sortOrder: 95,
    },
    {
      id: 'tpl-chinese-classic',
      name: '古风写真',
      category: '写真',
      description: '中国古典风格写真',
      stylePrompt: 'Chinese ancient style, hanfu traditional clothing, ink wash painting background, soft light, elegant pose',
      previewUrl: 'https://placehold.co/400x500/1a0f2e/eab308?text=%E5%8F%A4%E9%A3%8E%E5%86%99%E7%9C%9F',
      hasOriginal: true,
      sortOrder: 90,
    },
    {
      id: 'tpl-id-photo',
      name: '证件照生成',
      category: '写真',
      description: 'AI 生成标准证件照',
      stylePrompt: 'Professional ID photo, studio lighting, white background, formal attire, sharp focus, neutral expression',
      previewUrl: 'https://placehold.co/400x500/0d1b2a/7c6aef?text=%E8%AF%81%E4%BB%B6%E7%85%A7',
      hasOriginal: true,
      sortOrder: 85,
    },
    // 灵感类
    {
      id: 'tpl-watercolor',
      name: '水彩风格',
      category: '灵感',
      description: '水彩画艺术风格',
      stylePrompt: 'Watercolor painting style, soft brush strokes, wet-on-wet technique, artistic, colorful splashes',
      previewUrl: 'https://placehold.co/400x500/1b2838/f97316?text=%E6%B0%B4%E5%BD%A9%E9%A3%8E%E6%A0%BC',
      hasOriginal: true,
      sortOrder: 80,
    },
    {
      id: 'tpl-collage',
      name: '灵感拼贴画',
      category: '灵感',
      description: '创意拼贴艺术风格',
      stylePrompt: 'Creative collage art, mixed media, torn paper edges, vintage textures, artistic composition',
      previewUrl: 'https://placehold.co/400x500/1c1917/7c6aef?text=%E6%8B%BC%E8%B4%B4%E7%94%BB',
      hasOriginal: false,
      sortOrder: 75,
    },
    // 萌宠类
    {
      id: 'tpl-cat-sticker',
      name: '可爱猫咪贴纸',
      category: '萌宠',
      description: '卡哇伊猫咪贴纸风格',
      stylePrompt: 'Cute cat sticker, kawaii style, big eyes, chibi proportions, white border, pastel colors',
      previewUrl: 'https://placehold.co/400x400/1a1a2e/eab308?text=%E7%8C%AB%E5%92%AA%E8%B4%B4%E7%BA%B8',
      hasOriginal: false,
      sortOrder: 88,
    },
    {
      id: 'tpl-pet-humanize',
      name: '宠物拟人化',
      category: '萌宠',
      description: '将宠物拟人化处理',
      stylePrompt: 'Anthropomorphic pet, human-like posture and clothing, adorable expression, fantasy setting, detailed fur texture',
      previewUrl: 'https://placehold.co/400x500/0c1a2e/eab308?text=%E5%AE%A0%E7%89%A9%E6%8B%9F%E4%BA%BA',
      hasOriginal: true,
      sortOrder: 86,
    },
    // 头像类
    {
      id: 'tpl-anime-avatar',
      name: '动漫头像生成',
      category: '头像',
      description: '二次元动漫风格头像',
      stylePrompt: 'Anime portrait, detailed anime art style, vibrant colors, expressive eyes, clean lines, studio quality',
      previewUrl: 'https://placehold.co/400x400/1e1e2e/7c6aef?text=%E5%8A%A8%E6%BC%AB%E5%A4%B4%E5%83%8F',
      hasOriginal: true,
      sortOrder: 92,
    },
    {
      id: 'tpl-pixel-avatar',
      name: '像素风头像',
      category: '头像',
      description: '复古像素艺术风格',
      stylePrompt: 'Pixel art portrait, retro game style, 16-bit aesthetic, clean pixels, vibrant palette',
      previewUrl: 'https://placehold.co/400x400/0f2027/f97316?text=%E5%83%8F%E7%B4%A0%E5%A4%B4%E5%83%8F',
      hasOriginal: true,
      sortOrder: 78,
    },
    // 表情包类
    {
      id: 'tpl-funny-meme',
      name: '搞笑表情包',
      category: '表情包',
      description: '生成搞笑表情包',
      stylePrompt: 'Funny meme style, exaggerated expression, bold text overlay, humorous, social media ready',
      previewUrl: 'https://placehold.co/400x400/1a1a3e/eab308?text=%E6%90%9E%E7%AC%91%E8%A1%A8%E6%83%85',
      hasOriginal: false,
      sortOrder: 82,
    },
    {
      id: 'tpl-q-meme',
      name: 'Q版表情包',
      category: '表情包',
      description: 'Q版可爱表情包',
      stylePrompt: 'Q版 chibi character, super deformed, cute expression, round body, big head, simple background',
      previewUrl: 'https://placehold.co/400x400/1b0f2e/7c6aef?text=Q%E7%89%88%E8%A1%A8%E6%83%85',
      hasOriginal: false,
      sortOrder: 79,
    },
  ];

  for (const tpl of templateData) {
    await prisma.template.upsert({
      where: { id: tpl.id },
      update: { ...tpl },
      create: { ...tpl, isActive: true },
    });
  }

  console.log('种子数据创建完成:', { defaultPersona, englishTeacher, codeHelper, templates: templateData.length });
}

main()
  .catch(e => {
    console.error('种子数据创建失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
