"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const prisma = new client_1.PrismaClient();
const CATEGORY_SEEDS = {
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
async function downloadImage(url, savePath) {
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Download failed: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(savePath, buffer);
}
async function main() {
    console.log('========================================');
    console.log('  修复模板封面图 - 使用占位图');
    console.log('========================================\n');
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir))
        fs.mkdirSync(uploadDir, { recursive: true });
    const templates = await prisma.aiStyleTemplate.findMany({
        include: { category: true },
        orderBy: { category: { sort: 'desc' } },
    });
    console.log(`找到 ${templates.length} 个模板\n`);
    const categoryCounters = {};
    let success = 0;
    let fail = 0;
    for (const tpl of templates) {
        const catName = tpl.category?.name || '默认';
        const seeds = CATEGORY_SEEDS[catName] || [9999];
        const idx = categoryCounters[catName] || 0;
        categoryCounters[catName] = idx + 1;
        const seed = seeds[idx % seeds.length];
        try {
            const url = `https://picsum.photos/seed/${seed}/768/1024`;
            const filename = `tpl_${tpl.id}.jpg`;
            const savePath = path.join(uploadDir, filename);
            console.log(`  [下载] ${catName} - ${tpl.name} (seed: ${seed})...`);
            await downloadImage(url, savePath);
            const localPath = `/uploads/${filename}`;
            await prisma.aiStyleTemplate.update({
                where: { id: tpl.id },
                data: { coverImg: localPath },
            });
            console.log(`  [完成] -> ${localPath}`);
            success++;
        }
        catch (error) {
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
//# sourceMappingURL=fix-with-placeholders.js.map