/**
 * 重试失败的模板图片生成
 * 运行: npx ts-node -r tsconfig-paths/register scripts/retry-failed.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function generateAndSave(prompt: string, savePath: string): Promise<void> {
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=1024&nologo=true`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: controller.signal });
    if (!res.ok) throw new Error(`Generation failed: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(savePath, buffer);
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const uploadDir = path.join(process.cwd(), 'uploads');

  const templates = await prisma.aiStyleTemplate.findMany({
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  });

  let retried = 0;
  let success = 0;
  let fail = 0;

  for (const tpl of templates) {
    const filename = `tpl_${tpl.id}.jpg`;
    const savePath = path.join(uploadDir, filename);

    // 跳过已成功下载的（文件大于 5KB）
    if (fs.existsSync(savePath) && fs.statSync(savePath).size > 5000) continue;

    retried++;
    try {
      console.log(`  [重试] ${tpl.category?.name} - ${tpl.name}...`);
      await generateAndSave(tpl.prompt, savePath);

      const localPath = `/uploads/${filename}`;
      await prisma.aiStyleTemplate.update({
        where: { id: tpl.id },
        data: { coverImg: localPath },
      });

      const size = fs.statSync(savePath).size;
      console.log(`  [完成] ${localPath} (${(size / 1024).toFixed(0)}KB)`);
      success++;
    } catch (error: any) {
      console.error(`  [失败] ${tpl.name}: ${error.message}`);
      fail++;
    }
  }

  console.log(`\n重试 ${retried} 个，成功: ${success}，失败: ${fail}`);
  await prisma.$disconnect();
}

main().catch(err => { console.error(err); prisma.$disconnect(); process.exit(1); });
