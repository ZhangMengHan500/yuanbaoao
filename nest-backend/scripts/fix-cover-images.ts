/**
 * 修复模板封面图：从 COS 下载图片到本地 uploads 目录，更新数据库 URL
 * 运行: npx ts-node -r tsconfig-paths/register scripts/fix-cover-images.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import COS from 'cos-nodejs-sdk-v5';

const prisma = new PrismaClient();

const cos = new COS({
  SecretId: 'AKID6Sn1AJLBwVs5MRK7h6PVP8eyEMH0ZTEq',
  SecretKey: 'VpyEUcYX3ThiW8RZVGrRfooiV9f7Thop',
});

const BUCKET = 'aiart-1258344699';
const REGION = 'ap-guangzhou';

// 从 COS URL 中提取对象 Key
function extractCosKey(url: string): string | null {
  // URL 格式: https://aiart-1258344699.cos.ap-guangzhou.myqcloud.com/text_to_img_pro/.../0?q-sign-...
  const match = url.match(/\.cos\.[^/]+\.myqcloud\.com\/(.+?)(?:\?|$)/);
  return match ? match[1] : null;
}

// 生成带签名的临时 URL
function getSignedUrl(key: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cos.getObjectUrl(
      {
        Bucket: BUCKET,
        Region: REGION,
        Key: key,
        Sign: true,
        Expires: 3600,
      },
      (err, data) => {
        if (err) reject(err);
        else resolve(data.Url);
      },
    );
  });
}

async function downloadImage(url: string, savePath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(savePath, buffer);
}

async function main() {
  console.log('========================================');
  console.log('  修复模板封面图 - 下载到本地');
  console.log('========================================\n');

  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  // 获取所有风格模板
  const templates = await prisma.aiStyleTemplate.findMany();
  console.log(`找到 ${templates.length} 个模板\n`);

  let success = 0;
  let fail = 0;

  for (const tpl of templates) {
    const cosKey = extractCosKey(tpl.coverImg);
    if (!cosKey) {
      console.log(`  [跳过] ${tpl.name}: 无法解析 COS Key`);
      fail++;
      continue;
    }

    try {
      // 生成新的签名 URL
      const signedUrl = await getSignedUrl(cosKey);

      // 下载图片
      const ext = path.extname(cosKey).split('?')[0] || '.png';
      const filename = `tpl_${tpl.id}${ext}`;
      const savePath = path.join(uploadDir, filename);

      console.log(`  [下载] ${tpl.name}...`);
      await downloadImage(signedUrl, savePath);

      // 更新数据库
      const localUrl = `/uploads/${filename}`;
      await prisma.aiStyleTemplate.update({
        where: { id: tpl.id },
        data: { coverImg: localUrl },
      });

      console.log(`  [完成] ${tpl.name} -> ${localUrl}`);
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
