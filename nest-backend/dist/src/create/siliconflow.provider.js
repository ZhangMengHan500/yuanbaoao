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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var SiliconFlowProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiliconFlowProvider = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const SILICONFLOW_API = 'https://api.siliconflow.cn/v1/images/generations';
const SILICONFLOW_KEY = process.env.SILICONFLOW_API_KEY || '';
const OUTPUT_DIR = './uploads';
const QUALITY_SUFFIX = ', masterpiece, best quality, ultra detailed, 8k resolution, photorealistic, ' +
    'cinematic lighting, soft shadows, sharp focus, professional photography, ' +
    'high detail skin texture, beautiful facial features, film grain';
let SiliconFlowProvider = SiliconFlowProvider_1 = class SiliconFlowProvider {
    constructor() {
        this.logger = new common_1.Logger(SiliconFlowProvider_1.name);
    }
    enhancePrompt(prompt) {
        if (prompt.includes('masterpiece') || prompt.includes('best quality') || prompt.includes('ultra detailed')) {
            return prompt;
        }
        return prompt + QUALITY_SUFFIX;
    }
    async generateImage(prompt, options) {
        if (!SILICONFLOW_KEY) {
            return { imageUrl: '', status: 'failed', error: 'SILICONFLOW_API_KEY 未配置' };
        }
        const w = options?.width || 512;
        const h = options?.height || 512;
        const body = {
            model: 'Kwai-Kolors/Kolors',
            prompt: this.enhancePrompt(prompt),
            image_size: `${w}x${h}`,
            num_inference_steps: 30,
        };
        if (options?.negativePrompt) {
            body.negative_prompt = options.negativePrompt;
        }
        if (options?.referenceImageUrl) {
            const base64 = await this.imageToBase64(options.referenceImageUrl);
            if (base64) {
                body.image = base64;
            }
        }
        try {
            this.logger.log(`Calling SiliconFlow API, prompt: ${prompt.substring(0, 60)}...`);
            const response = await (0, node_fetch_1.default)(SILICONFLOW_API, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SILICONFLOW_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errText = await response.text();
                this.logger.error(`SiliconFlow API error: ${response.status} - ${errText}`);
                return { imageUrl: '', status: 'failed', error: `API error: ${response.status}` };
            }
            const result = (await response.json());
            const imageUrl = result.images?.[0]?.url;
            if (!imageUrl) {
                return { imageUrl: '', status: 'failed', error: 'No image in response' };
            }
            const filename = `${Date.now()}_generated.png`;
            const filepath = path.join(OUTPUT_DIR, filename);
            if (!fs.existsSync(OUTPUT_DIR))
                fs.mkdirSync(OUTPUT_DIR, { recursive: true });
            const imgRes = await (0, node_fetch_1.default)(imageUrl);
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            fs.writeFileSync(filepath, buffer);
            this.logger.log(`Image saved: ${filepath}`);
            return { imageUrl: `/uploads/${filename}`, status: 'completed' };
        }
        catch (error) {
            this.logger.error(`SiliconFlow failed: ${error.message}`);
            return { imageUrl: '', status: 'failed', error: error.message };
        }
    }
    async imageToBase64(imageSource) {
        try {
            let buffer;
            if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
                const res = await (0, node_fetch_1.default)(imageSource);
                if (!res.ok)
                    return null;
                buffer = Buffer.from(await res.arrayBuffer());
            }
            else if (fs.existsSync(imageSource)) {
                buffer = fs.readFileSync(imageSource);
            }
            else {
                return null;
            }
            const ext = path.extname(imageSource).toLowerCase();
            const mimeMap = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.webp': 'image/webp',
            };
            const mime = mimeMap[ext] || 'image/png';
            return `data:${mime};base64,${buffer.toString('base64')}`;
        }
        catch {
            return null;
        }
    }
};
exports.SiliconFlowProvider = SiliconFlowProvider;
exports.SiliconFlowProvider = SiliconFlowProvider = SiliconFlowProvider_1 = __decorate([
    (0, common_1.Injectable)()
], SiliconFlowProvider);
//# sourceMappingURL=siliconflow.provider.js.map