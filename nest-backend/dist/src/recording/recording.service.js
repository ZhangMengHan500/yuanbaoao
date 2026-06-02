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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RecordingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
let RecordingService = RecordingService_1 = class RecordingService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(RecordingService_1.name);
        this.cachedNlsToken = null;
        this.dashscopeApiKey = this.configService.get('DASHSCOPE_API_KEY') || '';
        this.asrAppKey = this.configService.get('ASR_APP_KEY') || '';
        this.accessKeyId = this.configService.get('ALIBABA_ACCESS_KEY_ID') || '';
        this.accessKeySecret = this.configService.get('ALIBABA_ACCESS_KEY_SECRET') || '';
        this.logger.log(`ASR service ready, DashScope key=${this.dashscopeApiKey.substring(0, 10)}...`);
    }
    async getNLSToken() {
        if (this.cachedNlsToken && Date.now() < this.cachedNlsToken.expireTime) {
            return { token: this.cachedNlsToken.token, appId: this.cachedNlsToken.appId };
        }
        try {
            const RPCClient = require('@alicloud/pop-core').RPCClient;
            const client = new RPCClient({
                accessKeyId: this.accessKeyId,
                accessKeySecret: this.accessKeySecret,
                endpoint: 'http://nls-meta.cn-shanghai.aliyuncs.com',
                apiVersion: '2019-02-28',
            });
            const result = await client.request('CreateToken', { TokenExpireTime: 3600 });
            const token = result.Token?.Id;
            const appId = result.Token?.AppId;
            if (token) {
                this.cachedNlsToken = {
                    token,
                    appId: String(appId || this.asrAppKey),
                    expireTime: Date.now() + 3500 * 1000,
                };
                this.logger.log(`NLS Token 获取成功, appId=${appId}`);
                return { token, appId: String(appId || this.asrAppKey) };
            }
        }
        catch (err) {
            this.logger.warn(`NLS Token 获取失败: ${err.message}`);
        }
        return null;
    }
    getAppKey() {
        return this.asrAppKey;
    }
    getSimulatedText() {
        const texts = [
            '今天我们要讨论一下项目的进度安排，前端部分已经完成了基本框架的搭建，接下来需要完成各个功能模块的开发。',
            '请帮我总结一下这段录音的重点内容，包括主要讨论的问题和达成的共识。',
            '这节课我们学习了人工智能的基本概念，包括机器学习、深度学习和自然语言处理的应用场景。',
            '下午三点有一个技术评审会议，需要准备一下技术方案的演示文档，重点说明系统架构和技术选型。',
            '帮我写一封邮件给客户，告知项目进展顺利，预计下周五可以完成第一阶段的交付。',
        ];
        return texts[Math.floor(Math.random() * texts.length)];
    }
    async recognizeSpeech(audioBase64, format = 'wav') {
        const audioKB = Math.round((audioBase64.length * 3) / 4 / 1024);
        this.logger.log(`语音识别: ${audioKB}KB, format=${format}`);
        try {
            const result = await this.callDashScopeASR(audioBase64, format);
            if (result) {
                this.logger.log(`识别成功: ${result.substring(0, 80)}`);
                return result;
            }
        }
        catch (err) {
            this.logger.warn(`DashScope ASR失败: ${err.message}`);
        }
        this.logger.log('回退到模拟识别');
        return this.simulateRecognition();
    }
    async recognizeSpeechStrict(audioBase64, format = 'wav') {
        const audioKB = Math.round((audioBase64.length * 3) / 4 / 1024);
        this.logger.log(`严格语音识别: ${audioKB}KB, format=${format}`);
        const result = await this.callDashScopeASR(audioBase64, format);
        if (result) {
            this.logger.log(`识别成功: ${result.substring(0, 80)}`);
            return result;
        }
        throw new Error('语音识别结果为空');
    }
    async callDashScopeASR(audioBase64, format) {
        const tmpFile = path.join(os.tmpdir(), `asr_${Date.now()}.${format}`);
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        fs.writeFileSync(tmpFile, audioBuffer);
        this.logger.log(`临时文件: ${tmpFile} (${audioBuffer.length} bytes)`);
        try {
            const taskId = await this.createTranscriptionTask(tmpFile);
            this.logger.log(`转写任务已创建: ${taskId}`);
            for (let i = 0; i < 30; i++) {
                await this.sleep(2000);
                const result = await this.queryTranscriptionTask(taskId);
                this.logger.debug(`轮询 [${i + 1}]: status=${result.status}`);
                if (result.status === 'SUCCEEDED' && result.text) {
                    return result.text;
                }
                if (result.status === 'FAILED') {
                    throw new Error(`转写失败: ${result.errorMessage || 'unknown'}`);
                }
            }
            throw new Error('转写超时 (60s)');
        }
        finally {
            try {
                fs.unlinkSync(tmpFile);
            }
            catch { }
        }
    }
    async createTranscriptionTask(filePath) {
        const fileBuffer = fs.readFileSync(filePath);
        const base64Data = fileBuffer.toString('base64');
        const ext = filePath.split('.').pop()?.toLowerCase() || 'wav';
        const mimeMap = {
            wav: 'audio/wav',
            mp3: 'audio/mpeg',
            pcm: 'audio/pcm',
            m4a: 'audio/m4a',
            mp4: 'audio/mp4',
            webm: 'audio/webm',
            ogg: 'audio/ogg',
        };
        const mime = mimeMap[ext] || 'audio/wav';
        const dataUrl = `data:${mime};base64,${base64Data}`;
        this.logger.log(`创建转写任务: format=${ext}, mime=${mime}, size=${fileBuffer.length} bytes`);
        const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.dashscopeApiKey}`,
                'Content-Type': 'application/json',
                'X-DashScope-Async': 'enable',
            },
            body: JSON.stringify({
                model: 'paraformer-v2',
                input: {
                    file_urls: [dataUrl],
                },
                parameters: {
                    language_hints: ['zh'],
                },
            }),
        });
        const data = await response.json();
        this.logger.log(`创建任务响应: ${JSON.stringify(data).substring(0, 300)}`);
        if (data.output?.task_id) {
            return data.output.task_id;
        }
        throw new Error(`创建任务失败: ${data.code} - ${data.message}`);
    }
    async queryTranscriptionTask(taskId) {
        const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.dashscopeApiKey}`,
            },
        });
        const data = await response.json();
        this.logger.debug(`查询响应: ${JSON.stringify(data).substring(0, 300)}`);
        const status = data.output?.task_status || 'UNKNOWN';
        if (status === 'SUCCEEDED') {
            const results = data.output?.results || [];
            if (results.length > 0 && results[0].transcription_url) {
                const textResult = await this.fetchTranscriptionText(results[0].transcription_url);
                return { status: 'SUCCEEDED', text: textResult };
            }
            return { status: 'SUCCEEDED', text: '' };
        }
        if (status === 'FAILED') {
            return { status: 'FAILED', errorMessage: data.output?.message || 'Task failed' };
        }
        return { status };
    }
    async fetchTranscriptionText(url) {
        const response = await fetch(url);
        const data = await response.json();
        if (data.transcripts && Array.isArray(data.transcripts)) {
            return data.transcripts.map((t) => t.text || '').join('');
        }
        return JSON.stringify(data);
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    simulateRecognition() {
        const mockTexts = [
            '今天我们要讨论一下项目的进度安排，前端部分已经完成了基本框架的搭建，接下来需要完成各个功能模块的开发。',
            '请帮我总结一下这段录音的重点内容，包括主要讨论的问题和达成的共识。',
            '这节课我们学习了人工智能的基本概念，包括机器学习、深度学习和自然语言处理的应用场景。',
            '下午三点有一个技术评审会议，需要准备一下技术方案的演示文档，重点说明系统架构和技术选型。',
            '帮我写一封邮件给客户，告知项目进展顺利，预计下周五可以完成第一阶段的交付。',
        ];
        return mockTexts[Math.floor(Math.random() * mockTexts.length)];
    }
    async *streamAIResponse(text) {
        const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.dashscopeApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'qwen-plus',
                messages: [
                    {
                        role: 'system',
                        content: '你是一个智能助手，擅长对用户的内容进行分析、总结和回答。请用简洁清晰的中文回答，使用Markdown格式。',
                    },
                    { role: 'user', content: text },
                ],
                stream: true,
                temperature: 0.7,
                max_tokens: 2000,
            }),
        });
        if (!response.ok) {
            throw new Error(`AI API Error: ${response.status}`);
        }
        const reader = response.body?.getReader();
        if (!reader)
            throw new Error('No reader');
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim();
                    if (dataStr === '[DONE]')
                        return;
                    try {
                        const parsed = JSON.parse(dataStr);
                        const token = parsed.choices?.[0]?.delta?.content;
                        if (token)
                            yield token;
                    }
                    catch { }
                }
            }
        }
    }
    async *streamSummary(text, duration) {
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.dashscopeApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'qwen-plus',
                messages: [
                    {
                        role: 'system',
                        content: `你是一个专业的会议记录和内容总结助手。请根据用户提供的语音转写文本，生成结构化的总结报告。

输出格式要求（严格使用Markdown）：
1. 第一行是标题（用一句话概括主题）
2. 第二行是日期和时间，格式：YYYY-MM-DD | HH:MM
3. 然后是正文段落，简要描述内容概要
4. 接着是"## 小结"部分，用编号列表列出主要讨论点
5. 最后是"## 要点"部分，用bullet list列出关键信息

示例格式：
# 标题内容
${dateStr} | ${timeStr}

正文描述...

## 小结
1. 第一个讨论点
2. 第二个讨论点

## 要点
- 要点一
- 要点二`,
                    },
                    { role: 'user', content: `录音时长：${duration || '未知'}\n\n以下是语音转写内容，请生成结构化总结：\n\n${text}` },
                ],
                stream: true,
                temperature: 0.5,
                max_tokens: 2000,
            }),
        });
        if (!response.ok) {
            throw new Error(`AI API Error: ${response.status}`);
        }
        const reader = response.body?.getReader();
        if (!reader)
            throw new Error('No reader');
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim();
                    if (dataStr === '[DONE]')
                        return;
                    try {
                        const parsed = JSON.parse(dataStr);
                        const token = parsed.choices?.[0]?.delta?.content;
                        if (token)
                            yield token;
                    }
                    catch { }
                }
            }
        }
    }
    async *streamAnalysis(text, duration) {
        const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.dashscopeApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'qwen-plus',
                messages: [
                    {
                        role: 'system',
                        content: `你是一个智能分析助手，擅长对语音内容进行深度分析和解读。请用简洁、专业、有洞察力的中文进行分析。

分析要求：
1. 分析说话者的主要观点和意图
2. 识别内容中的关键技术或概念
3. 给出你的专业见解和建议
4. 分段输出，每段一个要点，用自然流畅的语言表达
5. 不要使用Markdown格式，直接输出纯文本段落
6. 每段之间空一行`,
                    },
                    { role: 'user', content: `录音时长：${duration || '未知'}\n\n以下是语音转写内容，请进行深度分析：\n\n${text}` },
                ],
                stream: true,
                temperature: 0.7,
                max_tokens: 1500,
            }),
        });
        if (!response.ok) {
            throw new Error(`AI API Error: ${response.status}`);
        }
        const reader = response.body?.getReader();
        if (!reader)
            throw new Error('No reader');
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim();
                    if (dataStr === '[DONE]')
                        return;
                    try {
                        const parsed = JSON.parse(dataStr);
                        const token = parsed.choices?.[0]?.delta?.content;
                        if (token)
                            yield token;
                    }
                    catch { }
                }
            }
        }
    }
    async synthesizeSpeech(text) {
        this.logger.log('语音合成...');
        try {
            const audioBuffer = await this.callDashScopeTTS(text);
            this.logger.log(`TTS成功: ${audioBuffer.length} bytes`);
            return audioBuffer;
        }
        catch (err) {
            this.logger.warn(`DashScope TTS失败: ${err.message}, 尝试 NLS TTS`);
            try {
                const audioBuffer = await this.callAliyunTTS(text);
                this.logger.log(`NLS TTS成功: ${audioBuffer.length} bytes`);
                return audioBuffer;
            }
            catch (err2) {
                this.logger.warn(`NLS TTS也失败: ${err2.message}`);
                return Buffer.alloc(0);
            }
        }
    }
    async callDashScopeTTS(text) {
        const WebSocket = require('ws');
        const wssUrl = `wss://dashscope.aliyuncs.com/api-ws/v1/inference/?Token=${this.dashscopeApiKey}`;
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(wssUrl);
            const audioChunks = [];
            let finished = false;
            const timeout = setTimeout(() => {
                if (!finished) {
                    finished = true;
                    ws.close();
                    reject(new Error('DashScope TTS timeout'));
                }
            }, 15000);
            ws.on('open', () => {
                ws.send(JSON.stringify({
                    header: {
                        action: 'run-task',
                        task_id: this.generateId(),
                        streaming: 'once',
                    },
                    payload: {
                        task_group: 'audio',
                        task: 'tts',
                        function: 'SpeechSynthesizer',
                        model: 'cosyvoice-v2',
                        parameters: {
                            text_type: 'PlainText',
                            voice: 'longxiaochun',
                            format: 'wav',
                            sample_rate: 16000,
                            volume: 50,
                            pitch: 50,
                            speed: 100,
                        },
                        input: {
                            text,
                        },
                    },
                }));
            });
            ws.on('message', (data, isBinary) => {
                if (isBinary) {
                    audioChunks.push(data);
                }
                else {
                    try {
                        const msg = JSON.parse(data.toString());
                        if (msg.header?.event === 'task-finished') {
                            finished = true;
                            clearTimeout(timeout);
                            ws.close();
                            resolve(Buffer.concat(audioChunks));
                        }
                        else if (msg.header?.event === 'task-failed') {
                            finished = true;
                            clearTimeout(timeout);
                            ws.close();
                            reject(new Error(`TTS task failed: ${JSON.stringify(msg)}`));
                        }
                    }
                    catch { }
                }
            });
            ws.on('error', (err) => {
                if (!finished) {
                    finished = true;
                    clearTimeout(timeout);
                    reject(err);
                }
            });
            ws.on('close', () => {
                if (!finished) {
                    finished = true;
                    clearTimeout(timeout);
                    if (audioChunks.length > 0) {
                        resolve(Buffer.concat(audioChunks));
                    }
                    else {
                        reject(new Error('TTS WebSocket closed without audio'));
                    }
                }
            });
        });
    }
    async callAliyunTTS(text) {
        const accessKeyId = this.configService.get('ALIBABA_ACCESS_KEY_ID') || '';
        const accessKeySecret = this.configService.get('ALIBABA_ACCESS_KEY_SECRET') || '';
        const host = 'nls-gateway.cn-shanghai.aliyuncs.com';
        const path = '/stream/v1/tts';
        const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
        const params = {
            Action: 'SubmitTask',
            Version: '2021-03-25',
            AppKey: this.asrAppKey,
            Timestamp: timestamp,
            Text: text,
            Voice: 'zhixiaoxia',
            Format: 'wav',
            SampleRate: '16000',
            Volume: '50',
            Speed: '100',
            Pitch: '50',
        };
        const sortedKeys = Object.keys(params).sort();
        const canonicalQuery = sortedKeys
            .map((k) => `${this.percentEncode(k)}=${this.percentEncode(params[k])}`)
            .join('&');
        const stringToSign = `POST&${this.percentEncode(path)}&${this.percentEncode(canonicalQuery)}`;
        const signature = crypto
            .createHmac('sha1', accessKeySecret + '&')
            .update(stringToSign)
            .digest('base64');
        const queryStr = sortedKeys
            .map((k) => `${this.percentEncode(k)}=${this.percentEncode(params[k])}`)
            .join('&');
        const url = `https://${host}${path}?Signature=${this.percentEncode(signature)}&${queryStr}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            throw new Error(`TTS HTTP ${response.status}`);
        }
        return Buffer.from(await response.arrayBuffer());
    }
    percentEncode(str) {
        return encodeURIComponent(str)
            .replace(/\+/g, '%20')
            .replace(/\*/g, '%2A')
            .replace(/%7E/g, '~');
    }
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
    }
};
exports.RecordingService = RecordingService;
exports.RecordingService = RecordingService = RecordingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RecordingService);
//# sourceMappingURL=recording.service.js.map