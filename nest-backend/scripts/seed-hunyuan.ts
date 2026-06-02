/**
 * 腾讯混元生图种子脚本
 * 功能：清空旧模板 → 调用混元API生成36张人像图片 → 写入 ai_style_template 表
 *
 * 运行: npx ts-node -r tsconfig-paths/register scripts/seed-hunyuan.ts
 */

import { PrismaClient } from '@prisma/client';

// ===== 腾讯云 SDK =====
const { Client: HunyuanClient } = require('tencentcloud-sdk-nodejs-hunyuan').hunyuan.v20230901;

const client = new HunyuanClient({
  credential: {
    secretId: 'AKID6Sn1AJLBwVs5MRK7h6PVP8eyEMH0ZTEq',
    secretKey: 'VpyEUcYX3ThiW8RZVGrRfooiV9f7Thop',
  },
  region: 'ap-guangzhou',
  profile: {
    httpProfile: {
      endpoint: 'hunyuan.tencentcloudapi.com',
    },
  },
});

const prisma = new PrismaClient();

// ===== 分类配置：每个分类4张，竖版3:4（768x1024） =====
const CATEGORIES = [
  {
    name: '写真',
    sort: 10,
    templates: [
      { name: '日系清新写真', prompt: '一位年轻亚洲女性，日系清新写真风格，柔和自然光，浅色连衣裙，樱花背景，肤色白皙，五官精致，半身照，竖版人像摄影，高清细腻' },
      { name: '复古胶片写真', prompt: '一位优雅亚洲女性，复古胶片写真风格，暖色调胶片质感，80年代港风造型，卷发红唇，竖版半身人像，电影感光影' },
      { name: '韩式证件照', prompt: '一位亚洲女性韩式证件照，精致妆容，白衬衫，自然微笑，柔光背景，竖版胸部以上人像，专业摄影棚质感' },
      { name: '森系仙女写真', prompt: '一位亚洲女性森系写真，白色长裙，森林背景，阳光透过树叶洒落，梦幻氛围，竖版全身人像，清新自然' },
    ],
  },
  {
    name: '灵感',
    sort: 9,
    templates: [
      { name: '赛博朋克风', prompt: '一位亚洲女性赛博朋克风格人像，霓虹灯光，未来感机械臂装饰，紫色蓝色霓虹，暗色背景，竖版半身人像，科幻质感' },
      { name: '水墨国风', prompt: '一位中国古代汉服女性，水墨画风格，传统发髻，手持折扇，山水背景，竖版全身人像，国风美学' },
      { name: '油画艺术人像', prompt: '一位欧洲古典女性油画肖像，文艺复兴风格，柔和光影，深色背景，丝绒长裙，竖版半身像，古典艺术感' },
      { name: '光影艺术照', prompt: '一位亚洲女性艺术人像，强烈的明暗对比光影，黑白风格，侧脸轮廓，竖版特写人像，戏剧性光影效果' },
    ],
  },
  {
    name: '萌宠',
    sort: 8,
    templates: [
      { name: '可爱猫咪', prompt: '一只可爱橘色猫咪特写，大眼睛，毛茸茸的毛发，柔光背景，竖版宠物摄影，高清细腻，治愈系' },
      { name: '柴犬微笑', prompt: '一只柴犬正面特写，微笑表情，舌头伸出，暖色背景，竖版宠物摄影，可爱治愈' },
      { name: '布偶猫蓝眼', prompt: '一只布偶猫特写，蓝色大眼睛，白色长毛，优雅姿态，柔光室内背景，竖版宠物肖像' },
      { name: '金毛幼犬', prompt: '一只金毛幼犬特写，圆滚滚的身体，大眼睛，草地背景，阳光温暖，竖版宠物摄影，萌系可爱' },
    ],
  },
  {
    name: '头像',
    sort: 7,
    templates: [
      { name: '简约商务头像', prompt: '一位亚洲男性商务头像，穿西装，自信微笑，简洁纯色背景，竖版胸部以上，专业质感，高清' },
      { name: '清新少女头像', prompt: '一位亚洲年轻女性头像，清纯甜美，自然妆容，白色T恤，浅色背景，竖版胸部以上，清新自然' },
      { name: '文艺青年头像', prompt: '一位亚洲年轻人头像，文艺气质，戴圆框眼镜，手持书本，暖色背景，竖版半身，知性风格' },
      { name: '阳光运动头像', prompt: '一位亚洲男性运动头像，阳光帅气，运动服，自信笑容，户外背景，竖版胸部以上，活力感' },
    ],
  },
  {
    name: '表情包',
    sort: 6,
    templates: [
      { name: '搞笑夸张表情', prompt: '一个卡通人物夸张搞笑表情包，大笑到流泪，圆脸大眼，简洁白色背景，竖版，可爱搞笑风格' },
      { name: '卖萌可爱表情', prompt: '一个Q版卡通人物卖萌表情包，嘟嘴比心，粉色背景，大头小身体，竖版，萌系可爱风格' },
      { name: '无语翻白眼', prompt: '一个卡通人物翻白眼表情包，无奈表情，双手抱胸，简洁背景，竖版，搞笑幽默风格' },
      { name: '加油打气表情', prompt: '一个卡通人物握拳加油表情包，元气满满，星星眼，彩色背景，竖版，正能量可爱风格' },
    ],
  },
  {
    name: '插画',
    sort: 5,
    templates: [
      { name: '手绘人像插画', prompt: '一位亚洲女性手绘插画风格肖像，铅笔素描质感，细腻线条，柔和阴影，竖版半身像，艺术插画' },
      { name: '扁平人物插画', prompt: '一位年轻女性扁平插画风格，几何色块，现代设计感，简洁背景，竖版全身像，潮流插画' },
      { name: '水彩人物插画', prompt: '一位亚洲女性水彩插画风格，柔和色彩晕染，梦幻氛围，花朵装饰，竖版半身像，唯美水彩画' },
      { name: '潮流涂鸦插画', prompt: '一位年轻人潮流涂鸦插画风格，街头艺术感，鲜艳色彩，大胆线条，竖版全身像，波普艺术' },
    ],
  },
  {
    name: '3D',
    sort: 4,
    templates: [
      { name: '3D卡通人物', prompt: '一个3D卡通风格可爱人物，皮克斯风格，大眼睛圆脸，柔和光影，纯色背景，竖版全身像，高质量3D渲染' },
      { name: '3D虚拟偶像', prompt: '一个3D虚拟偶像女性，未来科技感，发光装饰，紫色蓝色渐变背景，竖版半身像，高质量3D渲染' },
      { name: '3D Q版人物', prompt: '一个3D Q版可爱人物，大头小身体比例，萌系表情，糖果色背景，竖版全身像，精致3D建模' },
      { name: '3D写实人像', prompt: '一个3D超写实人像，年轻女性，精致面部细节，柔和光影，纯色背景，竖版半身像，逼真3D渲染' },
    ],
  },
  {
    name: '像素',
    sort: 3,
    templates: [
      { name: '像素冒险角色', prompt: '一个像素艺术风格冒险者角色，16位复古游戏风格，手持宝剑，勇者装扮，竖版全身像素人像' },
      { name: '像素魔法师', prompt: '一个像素艺术风格魔法师角色，紫色长袍，魔法杖，发光特效，复古游戏风格，竖版全身像素人像' },
      { name: '像素少女', prompt: '一个像素艺术风格可爱少女角色，粉色头发，精致像素细节，清新配色，竖版全身像素人像' },
      { name: '像素武士', prompt: '一个像素艺术风格日本武士角色，盔甲太刀，战国时代风格，精致像素细节，竖版全身像素人像' },
    ],
  },
  {
    name: '动漫',
    sort: 2,
    templates: [
      { name: '新海诚风格少女', prompt: '一位二次元动漫少女，新海诚动画风格，精致面部，飘逸长发，天空云朵背景，竖版全身人像，唯美动漫' },
      { name: '校园动漫少年', prompt: '一位二次元动漫少年，校园制服，清爽短发，樱花校园背景，竖版半身人像，日系动漫风格' },
      { name: '魔法少女', prompt: '一位二次元魔法少女，华丽魔法杖，星光特效，彩色渐变背景，竖版全身人像，精致日系动漫' },
      { name: '和风动漫少女', prompt: '一位二次元和服动漫少女，日本传统和服，樱花发饰，神社背景，竖版全身人像，精致日系动漫' },
    ],
  },
];

// ===== 调用混元API生成图片 =====
async function submitImageJob(prompt: string): Promise<string> {
  const params = {
    Prompt: prompt,
    Resolution: '768:1024', // 竖版3:4
    Num: 1,
    Revise: 0, // 不改写prompt
    LogoAdd: 0, // 不加水印
  };

  console.log(`  [提交] ${prompt.slice(0, 40)}...`);
  const result = await client.SubmitHunyuanImageJob(params);
  return result.JobId;
}

// ===== 轮询等待图片生成完成 =====
async function waitForResult(jobId: string, maxWait = 180000): Promise<string[]> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const result = await client.QueryHunyuanImageJob({ JobId: jobId });
    const status = result.JobStatusCode;

    if (status === '5') {
      // 完成
      return result.ResultImage || [];
    }
    if (status === '4') {
      // 失败
      throw new Error(`任务失败: ${result.JobErrorMsg || result.JobErrorCode}`);
    }

    // 排队中或处理中，等待3秒后重试
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  throw new Error('等待超时');
}

// ===== 下载图片并保存到本地 uploads 目录 =====
async function downloadImageToLocal(url: string, filename: string): Promise<string> {
  const uploadDir = require('path').join(process.cwd(), 'uploads');
  if (!require('fs').existsSync(uploadDir)) require('fs').mkdirSync(uploadDir, { recursive: true });
  const savePath = require('path').join(uploadDir, filename);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`下载失败: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  require('fs').writeFileSync(savePath, buffer);
  return `/uploads/${filename}`;
}

// ===== 主流程 =====
async function main() {
  console.log('========================================');
  console.log('  腾讯混元生图 - 种子脚本');
  console.log('========================================\n');

  // 1. 清空旧数据
  console.log('[1/3] 清空旧数据...');
  await prisma.$executeRaw`DELETE FROM "ImageJob"`;
  await prisma.$executeRaw`DELETE FROM "Template"`;
  await prisma.$executeRaw`DELETE FROM ai_style_template`;
  await prisma.$executeRaw`DELETE FROM style_category`;
  console.log('  已清空 Template、ImageJob、ai_style_template、style_category 表\n');

  // 2. 创建分类
  console.log('[2/3] 创建风格分类...');
  const categoryMap: Record<string, string> = {};

  for (const cat of CATEGORIES) {
    const created = await prisma.styleCategory.create({
      data: { name: cat.name, sort: cat.sort },
    });
    categoryMap[cat.name] = created.id;
    console.log(`  ✓ ${cat.name} (${created.id})`);
  }
  console.log('');

  // 3. 逐分类生成图片
  console.log('[3/3] 调用混元API生成图片...\n');

  let totalSuccess = 0;
  let totalFail = 0;

  for (const cat of CATEGORIES) {
    console.log(`\n━━━ 分类: ${cat.name} ━━━`);
    const categoryId = categoryMap[cat.name];

    for (let i = 0; i < cat.templates.length; i++) {
      const tpl = cat.templates[i];
      try {
        // 提交生成任务
        const jobId = await submitImageJob(tpl.prompt);

        // 等待结果
        console.log(`  [等待] 生成中...`);
        const imageUrls = await waitForResult(jobId);

        if (imageUrls.length === 0) {
          throw new Error('未返回图片URL');
        }

        // 使用第一张图片，立即下载到本地（COS 签名 URL 会过期）
        const imageUrl = imageUrls[0];
        console.log(`  [完成] 已生成: ${tpl.name}`);
        console.log(`  [URL] ${imageUrl.slice(0, 80)}...`);

        // 下载到本地
        const localFilename = `tpl_${tpl.name.replace(/[^a-zA-Z0-9一-龥]/g, '_')}.png`;
        const localPath = await downloadImageToLocal(imageUrl, localFilename);
        console.log(`  [下载] 已保存到: ${localPath}`);

        // 写入数据库（使用本地路径）
        await prisma.aiStyleTemplate.create({
          data: {
            name: tpl.name,
            coverImg: localPath,
            prompt: tpl.prompt,
            categoryId,
          },
        });

        console.log(`  [入库] ✓ ${tpl.name}\n`);
        totalSuccess++;
      } catch (error: any) {
        console.error(`  [失败] ✗ ${tpl.name}: ${error.message}\n`);
        totalFail++;
      }
    }
  }

  // 4. 汇总
  console.log('\n========================================');
  console.log(`  完成! 成功: ${totalSuccess}, 失败: ${totalFail}`);
  console.log('========================================');

  // 5. 验证
  const count = await prisma.aiStyleTemplate.count();
  const catCount = await prisma.styleCategory.count();
  console.log(`\n数据库验证:`);
  console.log(`  分类数: ${catCount}`);
  console.log(`  模板数: ${count}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('脚本执行失败:', err);
  prisma.$disconnect();
  process.exit(1);
});
