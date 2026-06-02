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
var SiliconFlowVideo_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiliconFlowVideo = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const SILICONFLOW_API_BASE = 'https://api.siliconflow.cn/v1';
const SILICONFLOW_KEY = process.env.SILICONFLOW_API_KEY || '';
const OUTPUT_DIR = './uploads/videos';
const MODEL_T2V = 'Wan-AI/Wan2.2-T2V-A14B';
const MODEL_I2V = 'Wan-AI/Wan2.2-I2V-A14B';
let SiliconFlowVideo = SiliconFlowVideo_1 = class SiliconFlowVideo {
    constructor() {
        this.logger = new common_1.Logger(SiliconFlowVideo_1.name);
    }
    async submitTask(params) {
        if (!SILICONFLOW_KEY) {
            throw new Error('SILICONFLOW_API_KEY 未配置');
        }
        const isImg2Vid = !!params.inputImageUrl;
        const model = isImg2Vid ? MODEL_I2V : MODEL_T2V;
        const resolution = params.resolution || '1280x720';
        const [width, height] = resolution.split('x').map(Number);
        const body = {
            model,
            prompt: params.prompt,
            image_size: `${width}x${height}`,
        };
        if (isImg2Vid && params.inputImageUrl) {
            const base64 = await this.imageToBase64(params.inputImageUrl);
            if (base64) {
                body.image = base64;
            }
        }
        this.logger.log(`Submitting video task: model=${model}, resolution=${resolution}`);
        const response = await (0, node_fetch_1.default)(`${SILICONFLOW_API_BASE}/video/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SILICONFLOW_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errText = await response.text();
            this.logger.error(`SiliconFlow video submit error: ${response.status} - ${errText}`);
            throw new Error(`SiliconFlow API error: ${response.status}`);
        }
        const result = (await response.json());
        this.logger.log(`SiliconFlow video submit response: ${JSON.stringify(result)}`);
        const taskId = result.requestId || result.task_id || result.id;
        if (!taskId) {
            this.logger.error(`No requestId found. Full response: ${JSON.stringify(result)}`);
            throw new Error('No requestId in response');
        }
        this.logger.log(`Video task submitted: requestId=${taskId}`);
        return { taskId };
    }
    async checkStatus(taskId) {
        if (!SILICONFLOW_KEY) {
            throw new Error('SILICONFLOW_API_KEY 未配置');
        }
        const response = await (0, node_fetch_1.default)(`${SILICONFLOW_API_BASE}/video/status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SILICONFLOW_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requestId: taskId }),
        });
        if (!response.ok) {
            const errText = await response.text();
            this.logger.error(`SiliconFlow video status error: ${response.status} - ${errText}`);
            throw new Error(`SiliconFlow API error: ${response.status}`);
        }
        const result = (await response.json());
        this.logger.log(`Video status: taskId=${taskId}, status=${result.status}`);
        if (result.status === 'Succeed') {
            const videoUrl = result.results?.videos?.[0]?.url;
            return { status: 'completed', videoUrl };
        }
        if (result.status === 'Failed') {
            return { status: 'failed', errorMsg: result.reason || 'Video generation failed' };
        }
        return {
            status: 'processing',
            progress: result.position || 0,
        };
    }
    async downloadVideo(url) {
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }
        const filename = `${Date.now()}_video.mp4`;
        const filepath = path.join(OUTPUT_DIR, filename);
        const response = await (0, node_fetch_1.default)(url);
        if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(filepath, buffer);
        this.logger.log(`Video saved: ${filepath} (${buffer.length} bytes)`);
        return `/uploads/videos/${filename}`;
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
exports.SiliconFlowVideo = SiliconFlowVideo;
exports.SiliconFlowVideo = SiliconFlowVideo = SiliconFlowVideo_1 = __decorate([
    (0, common_1.Injectable)()
], SiliconFlowVideo);
//# sourceMappingURL=siliconflow-video.js.map