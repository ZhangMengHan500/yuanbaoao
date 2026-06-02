/**
 * 王者荣耀 COS 英雄图片重新生成脚本
 * 功能：删除指定英雄旧数据 → 调用SiliconFlow API生成高清cos图 → 写入 cos_hero 表
 *
 * 运行: npx ts-node -r tsconfig-paths/register scripts/seed-cos-heroes.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const SILICONFLOW_API = 'https://api.siliconflow.cn/v1/images/generations';
const SILICONFLOW_KEY = process.env.SILICONFLOW_API_KEY || 'sk-zaxzqqdvkcanasxxpetszqopowssxsepqooozbpicdjwdltj';
const OUTPUT_DIR = path.join(process.cwd(), 'uploads');

const prisma = new PrismaClient();

// 需要重新生成的5个英雄
const HEROES = [
  {
    name: '李白',
    color: '#8b5cf6',
    desc: '青莲剑仙',
    sortOrder: 3,
    previewPrompt:
      '王者荣耀李白, 全身照, 少年侠客, 潇洒帅气, 清冷古风, 黑色长发, 白色束发, 白衣古风侠客服饰, 眉眼锐利, 潇洒不羁, 高清写实, 王者荣耀官方原画质感, 真人cos写真, 电影级光影, 精致五官, 细腻皮肤, 氛围感, 高清8k, 柔和高级, 适合AI换脸模板, 竖版9:16, masterpiece, best quality, highly detailed, cinematic lighting, 柔和高级感',
    cosPrompt:
      '李白cosplay, 全身照, 少年侠客, 潇洒帅气, 清冷古风, 黑色长发白色束发, 白衣侠客服饰, 眉眼锐利, 潇洒不羁, 写实真人, 电影光影, 8k, 高清',
  },
  {
    name: '大乔',
    color: '#3b82f6',
    desc: '沧海之曜',
    sortOrder: 1,
    previewPrompt:
      '王者荣耀大乔, 全身照, 温柔古风少女, 深蓝色长发, 水蓝色仙气纱裙, 温柔优雅, 仙气飘飘, 古风汉服, 水波纹元素, 梦幻唯美, 高清写实, 王者荣耀官方原画质感, 真人cos写真, 电影级光影, 精致五官, 细腻皮肤, 高清8k, 适合AI换脸模板, 竖版9:16, masterpiece, best quality, highly detailed, cinematic lighting, 柔和高级感',
    cosPrompt:
      '大乔cosplay, 全身照, 温柔古风少女, 深蓝色长发, 水蓝色仙气纱裙, 古风汉服, 仙气飘飘, 写实真人, 电影光影, 8k, 高清',
  },
  {
    name: '朵莉亚',
    color: '#06b6d4',
    desc: '人鱼之歌',
    sortOrder: 2,
    previewPrompt:
      '王者荣耀朵莉亚, 全身照, 人鱼少女, 蓝白渐变长发, 蓝色梦幻眼眸, 人鱼精灵, 梦幻海洋人鱼风, 梦幻唯美, 海洋元素, 浅蓝鱼尾服饰, 甜美灵动, 高清写实, 王者荣耀官方原画质感, 真人cos写真, 电影级光影, 精致五官, 细腻皮肤, 高清8k, 适合AI换脸模板, 竖版9:16, masterpiece, best quality, highly detailed, cinematic lighting, 柔和高级感',
    cosPrompt:
      '朵莉亚cosplay, 全身照, 人鱼少女, 蓝白渐变长发, 蓝色梦幻眼眸, 人鱼精灵, 海洋人鱼风, 浅蓝鱼尾服饰, 甜美灵动, 写实真人, 电影光影, 8k, 高清',
  },
  {
    name: '蚩妩',
    color: '#c026d3',
    desc: '九尾妖狐',
    sortOrder: 0,
    previewPrompt:
      '王者荣耀蚩妩, 全身照, 元气国风少女, 黑白色短发, 黄橙挑染, 黄色国风服饰, 灵动俏皮, 元气可爱, 高清写实, 王者荣耀官方原画质感, 真人cos写真, 电影级光影, 精致五官, 细腻皮肤, 高清8k, 适合AI换脸模板, 竖版9:16, masterpiece, best quality, highly detailed, cinematic lighting, 柔和高级感',
    cosPrompt:
      '蚩妩cosplay, 全身照, 元气国风少女, 黑白色短发黄橙挑染, 黄色国风服饰, 灵动俏皮, 写实真人, 电影光影, 8k, 高清',
  },
  {
    name: '貂蝉',
    color: '#ec4899',
    desc: '绝世舞姬',
    sortOrder: 4,
    previewPrompt:
      '王者荣耀貂蝉, 全身照, 绝世舞姬, 妩媚古风, 酒红色长发, 华丽古风舞裙, 眉眼妩媚, 明艳动人, 温柔大气, 花瓣氛围感, 高清写实, 王者荣耀官方原画质感, 真人cos写真, 电影级光影, 精致五官, 细腻皮肤, 高清8k, 适合AI换脸模板, 竖版9:16, masterpiece, best quality, highly detailed, cinematic lighting, 柔和高级感',
    cosPrompt:
      '貂蝉cosplay, 全身照, 绝世舞姬, 妩媚古风, 酒红色长发, 华丽古风舞裙, 眉眼妩媚, 明艳动人, 写实真人, 电影光影, 8k, 高清',
  },
];

const NEGATIVE_PROMPT =
  'low quality, blurry, deformed, ugly, bad anatomy, bad hands, missing fingers, extra digits, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, bad proportions, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck';

// 调用 SiliconFlow API 生成图片
async function generateImage(prompt: string): Promise<string | null> {
  const body = {
    model: 'Kwai-Kolors/Kolors',
    prompt,
    image_size: '768x1024',
    num_inference_steps: 30,
    negative_prompt: NEGATIVE_PROMPT,
  };

  console.log(`  [API] 调用 SiliconFlow...`);
  console.log(`  [Prompt] ${prompt.substring(0, 80)}...`);

  const response = await fetch(SILICONFLOW_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SILICONFLOW_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`  [API Error] ${response.status}: ${errText}`);
    return null;
  }

  const result = (await response.json()) as any;
  const imageUrl = result.images?.[0]?.url;
  if (!imageUrl) {
    console.error('  [API Error] 未返回图片URL');
    return null;
  }

  return imageUrl;
}

// 下载图片保存到本地
async function downloadImage(url: string, filename: string): Promise<string> {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const response = await fetch(url);
  if (!response.ok) throw new Error(`下载失败: ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, buffer);

  return `/uploads/${filename}`;
}

// 主流程
async function main() {
  console.log('========================================');
  console.log('  王者荣耀 COS 英雄图片生成');
  console.log('========================================\n');

  // 1. 删除旧的英雄数据
  console.log('[1/3] 删除旧英雄数据...');
  const heroNames = HEROES.map(h => h.name);
  const deleted = await prisma.cosHero.deleteMany({
    where: { name: { in: heroNames } },
  });
  console.log(`  已删除 ${deleted.count} 条旧记录\n`);

  // 2. 逐个生成图片
  console.log('[2/3] 生成高清cos预览图...\n');

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < HEROES.length; i++) {
    const hero = HEROES[i];
    console.log(`━━━ [${i + 1}/${HEROES.length}] ${hero.name} ━━━`);

    let imageUrl: string | null = null;

    try {
      // 生成图片
      const remoteUrl = await generateImage(hero.previewPrompt);
      if (remoteUrl) {
        // 下载到本地
        const safeName = hero.name.replace(/[^一-龥a-zA-Z0-9]/g, '_');
        const filename = `cos_hero_${safeName}.png`;
        imageUrl = await downloadImage(remoteUrl, filename);
        console.log(`  [下载] ✓ ${imageUrl}`);
      }
    } catch (err: any) {
      console.error(`  [失败] ✗ ${hero.name}: ${err.message}`);
    }

    // 写入数据库
    await prisma.cosHero.create({
      data: {
        name: hero.name,
        color: hero.color,
        desc: hero.desc,
        imageUrl,
        previewPrompt: hero.previewPrompt,
        cosPrompt: hero.cosPrompt,
        sortOrder: hero.sortOrder,
      },
    });

    console.log(`  [入库] ✓ ${hero.name} (imageUrl: ${imageUrl || 'null'})\n`);
    successCount++;

    // 每次请求间隔 25 秒，避免 API 限流
    if (i < HEROES.length - 1) {
      console.log('  [等待] 25秒后继续...\n');
      await new Promise(r => setTimeout(r, 25000));
    }
  }

  // 3. 汇总
  console.log('\n========================================');
  console.log(`  完成! 成功: ${successCount}, 失败: ${failCount}`);
  console.log('========================================');

  // 4. 验证
  const allHeroes = await prisma.cosHero.findMany({
    orderBy: { sortOrder: 'asc' },
  });
  console.log(`\n数据库验证 (共 ${allHeroes.length} 个英雄):`);
  for (const h of allHeroes) {
    console.log(`  ${h.sortOrder}. ${h.name} - ${h.desc} - image: ${h.imageUrl || 'null'}`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('脚本执行失败:', err);
  prisma.$disconnect();
  process.exit(1);
});
