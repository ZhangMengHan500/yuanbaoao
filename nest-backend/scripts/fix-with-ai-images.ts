/**
 * 用 Pollinations AI 根据数据库中的原始 prompt 重新生成模板封面图
 * 运行: npx ts-node -r tsconfig-paths/register scripts/fix-with-ai-images.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function generateAndSave(prompt: string, savePath: string): Promise<void> {
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=1024&nologo=true`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Generation failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(savePath, buffer);
}

async function main() {
  console.log('========================================');
  console.log('  AI 重新生成模板封面图（匹配原始 prompt）');
  console.log('========================================\n');

  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const templates = await prisma.aiStyleTemplate.findMany({
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`找到 ${templates.length} 个模板\n`);

  let success = 0;
  let fail = 0;

  for (const tpl of templates) {
    try {
      const filename = `tpl_${tpl.id}.jpg`;
      const savePath = path.join(uploadDir, filename);

      console.log(`  [生成] ${tpl.category?.name} - ${tpl.name}`);
      console.log(`         prompt: ${tpl.prompt.slice(0, 50)}...`);
      await generateAndSave(tpl.prompt, savePath);

      const localPath = `/uploads/${filename}`;
      await prisma.aiStyleTemplate.update({
        where: { id: tpl.id },
        data: { coverImg: localPath },
      });

      const size = fs.statSync(savePath).size;
      console.log(`  [完成] ${localPath} (${(size / 1024).toFixed(0)}KB)\n`);
      success++;
    } catch (error: any) {
      console.error(`  [失败] ${tpl.name}: ${error.message}\n`);
      fail++;
    }
  }

  console.log('========================================');
  console.log(`  完成! 成功: ${success}, 失败: ${fail}`);
  console.log('========================================');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('脚本执行失败:', err);
  prisma.$disconnect();
  process.exit(1);
});
