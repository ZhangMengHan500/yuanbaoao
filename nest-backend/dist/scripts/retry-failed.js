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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
        const res = await fetch(url, { redirect: 'follow', signal: controller.signal });
        if (!res.ok)
            throw new Error(`Generation failed: ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(savePath, buffer);
    }
    finally {
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
        if (fs.existsSync(savePath) && fs.statSync(savePath).size > 5000)
            continue;
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
        }
        catch (error) {
            console.error(`  [失败] ${tpl.name}: ${error.message}`);
            fail++;
        }
    }
    console.log(`\n重试 ${retried} 个，成功: ${success}，失败: ${fail}`);
    await prisma.$disconnect();
}
main().catch(err => { console.error(err); prisma.$disconnect(); process.exit(1); });
//# sourceMappingURL=retry-failed.js.map