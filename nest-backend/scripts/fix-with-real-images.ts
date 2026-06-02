/**
 * 使用 Unsplash 真实照片修复模板封面图（按分类匹配）
 * 运行: npx ts-node -r tsconfig-paths/register scripts/fix-with-real-images.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// 按分类精选 Unsplash 照片（竖版，与模板内容匹配）
const CATEGORY_PHOTOS: Record<string, string[]> = {
  '写真': [
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=768&h=1024&fit=crop',  // 森系白裙少女
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=768&h=1024&fit=crop',  // 复古港风
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=768&h=1024&fit=crop',  // 韩式证件照
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=768&h=1024&fit=crop',  // 森系仙女
  ],
  '灵感': [
    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=768&h=1024&fit=crop',  // 赛博朋克霓虹
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=768&h=1024&fit=crop',  // 水墨国风
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=768&h=1024&fit=crop',  // 油画艺术
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=768&h=1024&fit=crop',  // 光影艺术
  ],
  '萌宠': [
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=768&h=1024&fit=crop',  // 橘猫
    'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=768&h=1024&fit=crop',  // 柴犬微笑
    'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=768&h=1024&fit=crop',  // 布偶猫
    'https://images.unsplash.com/photo-1552053831-71594a27632d?w=768&h=1024&fit=crop',  // 金毛幼犬
  ],
  '头像': [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=768&h=1024&fit=crop',  // 商务男性
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=768&h=1024&fit=crop',  // 清新少女
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=768&h=1024&fit=crop',  // 文艺青年
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=768&h=1024&fit=crop',  // 阳光运动
  ],
  '表情包': [
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=768&h=1024&fit=crop',  // 搞笑狗狗
    'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=768&h=1024&fit=crop',  // 卖萌猫咪
    'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=768&h=1024&fit=crop',  // 无语狗狗
    'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=768&h=1024&fit=crop',  // 加油狗狗
  ],
  '插画': [
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=768&h=1024&fit=crop',  // 手绘人像
    'https://images.unsplash.com/photo-1549490349-8643362247b5?w=768&h=1024&fit=crop',  // 扁平插画
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=768&h=1024&fit=crop',  // 水彩插画
    'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=768&h=1024&fit=crop',  // 涂鸦插画
  ],
  '3D': [
    'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=768&h=1024&fit=crop',  // 3D卡通
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=768&h=1024&fit=crop',  // 3D虚拟
    'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=768&h=1024&fit=crop',  // 3D Q版
    'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=768&h=1024&fit=crop',  // 3D写实
  ],
  '像素': [
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=768&h=1024&fit=crop',  // 像素冒险
    'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=768&h=1024&fit=crop',  // 像素魔法
    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=768&h=1024&fit=crop',  // 像素少女
    'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=768&h=1024&fit=crop',  // 像素武士
  ],
  '动漫': [
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=768&h=1024&fit=crop',  // 新海诚风
    'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=768&h=1024&fit=crop',  // 校园少年
    'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=768&h=1024&fit=crop',  // 魔法少女
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=768&h=1024&fit=crop',  // 和风少女
  ],
};

async function downloadImage(url: string, savePath: string): Promise<void> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(savePath, buffer);
}

async function main() {
  console.log('========================================');
  console.log('  修复模板封面图 - 使用 Unsplash 真实照片');
  console.log('========================================\n');

  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const templates = await prisma.aiStyleTemplate.findMany({
    include: { category: true },
    orderBy: { category: { sort: 'desc' } },
  });
  console.log(`找到 ${templates.length} 个模板\n`);

  const categoryCounters: Record<string, number> = {};
  let success = 0;
  let fail = 0;

  for (const tpl of templates) {
    const catName = tpl.category?.name || '默认';
    const photos = CATEGORY_PHOTOS[catName];
    if (!photos) {
      console.log(`  [跳过] ${catName} - ${tpl.name}: 无匹配分类`);
      fail++;
      continue;
    }

    const idx = categoryCounters[catName] || 0;
    categoryCounters[catName] = idx + 1;
    const photoUrl = photos[idx % photos.length];

    try {
      const filename = `tpl_${tpl.id}.jpg`;
      const savePath = path.join(uploadDir, filename);

      console.log(`  [下载] ${catName} - ${tpl.name}...`);
      await downloadImage(photoUrl, savePath);

      const localPath = `/uploads/${filename}`;
      await prisma.aiStyleTemplate.update({
        where: { id: tpl.id },
        data: { coverImg: localPath },
      });

      console.log(`  [完成] -> ${localPath}`);
      success++;
    } catch (error: any) {
      console.error(`  [失败] ${tpl.name}: ${error.message}`);
      fail++;
    }
  }

  console.log('\n========================================');
  console.log(`  完成! 成功: ${success}, 失败: ${fail}`);
  console.log('========================================');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('脚本执行失败:', err);
  prisma.$disconnect();
  process.exit(1);
});
