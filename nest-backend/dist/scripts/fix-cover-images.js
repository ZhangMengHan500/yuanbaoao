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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const cos_nodejs_sdk_v5_1 = __importDefault(require("cos-nodejs-sdk-v5"));
const prisma = new client_1.PrismaClient();
const cos = new cos_nodejs_sdk_v5_1.default({
    SecretId: 'AKID6Sn1AJLBwVs5MRK7h6PVP8eyEMH0ZTEq',
    SecretKey: 'VpyEUcYX3ThiW8RZVGrRfooiV9f7Thop',
});
const BUCKET = 'aiart-1258344699';
const REGION = 'ap-guangzhou';
function extractCosKey(url) {
    const match = url.match(/\.cos\.[^/]+\.myqcloud\.com\/(.+?)(?:\?|$)/);
    return match ? match[1] : null;
}
function getSignedUrl(key) {
    return new Promise((resolve, reject) => {
        cos.getObjectUrl({
            Bucket: BUCKET,
            Region: REGION,
            Key: key,
            Sign: true,
            Expires: 3600,
        }, (err, data) => {
            if (err)
                reject(err);
            else
                resolve(data.Url);
        });
    });
}
async function downloadImage(url, savePath) {
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Download failed: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(savePath, buffer);
}
async function main() {
    console.log('========================================');
    console.log('  修复模板封面图 - 下载到本地');
    console.log('========================================\n');
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir))
        fs.mkdirSync(uploadDir, { recursive: true });
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
            const signedUrl = await getSignedUrl(cosKey);
            const ext = path.extname(cosKey).split('?')[0] || '.png';
            const filename = `tpl_${tpl.id}${ext}`;
            const savePath = path.join(uploadDir, filename);
            console.log(`  [下载] ${tpl.name}...`);
            await downloadImage(signedUrl, savePath);
            const localUrl = `/uploads/${filename}`;
            await prisma.aiStyleTemplate.update({
                where: { id: tpl.id },
                data: { coverImg: localUrl },
            });
            console.log(`  [完成] ${tpl.name} -> ${localUrl}`);
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
//# sourceMappingURL=fix-cover-images.js.map