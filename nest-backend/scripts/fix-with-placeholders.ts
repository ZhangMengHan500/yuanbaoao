/**
 * 使用免费占位图修复模板封面图
 * 从 picsum.photos 下载图片到本地 uploads 目录，更新数据库
 * 运行: npx ts-node -r tsconfig-paths/register scripts/fix-with-placeholders.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// 每个模板使用不同的 seed 确保图片不同
const CATEGORY_SEEDS: Record<string, number[]> = {
  '写真': [1001, 1002, 1003, 1004],
  '灵感': [2001, 2002, 2003, 2004],
  '萌宠': [3001, 3002, 3003, 3004],
  '头像': [4001, 4002, 4003, 4004],
  '表情包': [5001, 5002, 5003, 5004],
  '插画': [6001, 6002, 6003, 6004],
  '3D': [7001, 7002, 7003, 7004],
  '像素': [8001, 8002, 8003, 8004],
  '动漫': [9001, 9002, 9003, 9004],
};

async function downloadImage(url: string, savePath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(savePath, buffer);
}

async function main() {
  console.log('========================================');
  console.log('  修复模板封面图 - 使用占位图');
  console.log('========================================\n');

  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  // 获取所有风格模板（按分类排序）
  const templates = await prisma.aiStyleTemplate.findMany({
    include: { category: true },
    orderBy: { category: { sort: 'desc' } },
  });
  console.log(`找到 ${templates.length} 个模板\n`);

  // 按分类分组，为每个模板分配 seed
  const categoryCounters: Record<string, number> = {};
  let success = 0;
  let fail = 0;

  for (const tpl of templates) {
    const catName = tpl.category?.name || '默认';
    const seeds = CATEGORY_SEEDS[catName] || [9999];
    const idx = categoryCounters[catName] || 0;
    categoryCounters[catName] = idx + 1;
    const seed = seeds[idx % seeds.length];

    try {
      // 使用 picsum.photos 获取占位图（竖版 768x1024）
      const url = `https://picsum.photos/seed/${seed}/768/1024`;
      const filename = `tpl_${tpl.id}.jpg`;
      const savePath = path.join(uploadDir, filename);

      console.log(`  [下载] ${catName} - ${tpl.name} (seed: ${seed})...`);
      await downloadImage(url, savePath);

      // 更新数据库
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
