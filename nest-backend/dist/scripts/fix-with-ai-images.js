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
async function generateAndSave(prompt, savePath) {
    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=1024&nologo=true`;
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok)
        throw new Error(`Generation failed: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(savePath, buffer);
}
async function main() {
    console.log('========================================');
    console.log('  AI 重新生成模板封面图（匹配原始 prompt）');
    console.log('========================================\n');
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir))
        fs.mkdirSync(uploadDir, { recursive: true });
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
        }
        catch (error) {
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
//# sourceMappingURL=fix-with-ai-images.js.map