"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const { Client: HunyuanClient } = require('tencentcloud-sdk-nodejs-hunyuan').hunyuan.v20230901;
const client = new HunyuanClient({
    credential: {
        secretId: 'AKID6Sn1AJLBwVs5MRK7h6PVP8eyEMH0ZTEq',
        secretKey: 'VpyEUcYX3ThiW8RZVGrRfooiV9f7Thop',
    },
    region: 'ap-guangzhou',
});
const prisma = new client_1.PrismaClient();
const MISSING = [
    { name: '日系清新写真', prompt: '一位年轻亚洲女性，日系清新写真风格，柔和自然光，浅色连衣裙，樱花背景，肤色白皙，五官精致，半身照，竖版人像摄影，高清细腻' },
    { name: '复古胶片写真', prompt: '一位优雅亚洲女性，复古胶片写真风格，暖色调胶片质感，80年代港风造型，卷发红唇，竖版半身人像，电影感光影' },
    { name: '韩式证件照', prompt: '一位亚洲女性韩式证件照，精致妆容，白衬衫，自然微笑，柔光背景，竖版胸部以上人像，专业摄影棚质感' },
];
async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}
async function generateOne(prompt) {
    const submit = await client.SubmitHunyuanImageJob({
        Prompt: prompt,
        Resolution: '768:1024',
        Num: 1,
        Revise: 0,
        LogoAdd: 0,
    });
    const jobId = submit.JobId;
    console.log(`  JobId: ${jobId}`);
    for (let i = 0; i < 60; i++) {
        await sleep(3000);
        const result = await client.QueryHunyuanImageJob({ JobId: jobId });
        if (result.JobStatusCode === '5') {
            const urls = result.ResultImage || [];
            if (urls.length > 0)
                return urls[0];
            throw new Error('No image returned');
        }
        if (result.JobStatusCode === '4') {
            throw new Error(result.JobErrorMsg || 'Failed');
        }
    }
    throw new Error('Timeout');
}
async function main() {
    const cat = await prisma.styleCategory.findFirst({ where: { name: '写真' } });
    if (!cat) {
        console.error('写真分类不存在');
        return;
    }
    console.log(`写真分类ID: ${cat.id}\n`);
    for (const tpl of MISSING) {
        console.log(`>>> ${tpl.name}`);
        try {
            const url = await generateOne(tpl.prompt);
            console.log(`  URL: ${url.slice(0, 80)}...`);
            await prisma.aiStyleTemplate.create({
                data: { name: tpl.name, coverImg: url, prompt: tpl.prompt, categoryId: cat.id },
            });
            console.log(`  OK\n`);
        }
        catch (e) {
            console.error(`  FAIL: ${e.message}\n`);
        }
        await sleep(5000);
    }
    const count = await prisma.aiStyleTemplate.count();
    console.log(`Total templates: ${count}`);
    await prisma.$disconnect();
}
main();
//# sourceMappingURL=fix-xiezhen.js.map