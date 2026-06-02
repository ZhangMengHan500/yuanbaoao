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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var VoiceCallGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceCallGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const voice_call_service_1 = require("./voice-call.service");
const ws_1 = __importDefault(require("ws"));
const uuid_1 = require("uuid");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
let VoiceCallGateway = VoiceCallGateway_1 = class VoiceCallGateway {
    constructor(voiceCallService) {
        this.voiceCallService = voiceCallService;
        this.logger = new common_1.Logger(VoiceCallGateway_1.name);
        this.clientStates = new Map();
    }
    handleConnection(client) {
        this.logger.log(`VoiceCall client connected: ${client.id}`);
        this.clientStates.set(client.id, {
            isInCall: false,
            isNlsReady: false,
            isAiSpeaking: false,
            isInterrupted: false,
            isProcessing: false,
            nlsSocket: null,
            nlsTaskId: null,
            conversationHistory: [],
            fullAiResponse: '',
            silenceTimer: null,
            lastInterimText: '',
        });
    }
    handleDisconnect(client) {
        this.logger.log(`VoiceCall client disconnected: ${client.id}`);
        const state = this.clientStates.get(client.id);
        if (state?.nlsSocket) {
            state.nlsSocket.close();
        }
        this.clientStates.delete(client.id);
    }
    async handleStartCall(client) {
        this.logger.log(`Start voice call for ${client.id}`);
        const state = this.clientStates.get(client.id);
        if (!state)
            return;
        state.isInCall = true;
        state.isNlsReady = false;
        state.conversationHistory = [];
        state.fullAiResponse = '';
        try {
            const tokenInfo = await this.voiceCallService.getNLSTokenInfo();
            if (!tokenInfo) {
                this.logger.warn('NLS Token 获取失败，使用模拟模式');
                client.emit('call-started');
                return;
            }
            const nlsSocket = await this.connectToNLS(client, tokenInfo);
            state.nlsSocket = nlsSocket;
            client.emit('call-started');
            await this.sendGreeting(client, state);
        }
        catch (err) {
            this.logger.error(`Start call failed: ${err.message}`);
            client.emit('call-started');
            await this.sendGreeting(client, state);
        }
    }
    async sendGreeting(client, state) {
        const greeting = '你好，我是元宝AI助手，有什么可以帮助您的吗？';
        this.logger.log(`Sending greeting: ${greeting}`);
        state.isAiSpeaking = true;
        client.emit('ai-thinking');
        client.emit('ai-text-chunk', { text: greeting });
        const ok = await this.ttsAndSend(client, state, greeting);
        if (!ok) {
            client.emit('ai-speech', { text: greeting });
        }
        state.conversationHistory.push({ role: 'assistant', content: greeting });
    }
    async connectToNLS(client, tokenInfo) {
        const { token } = tokenInfo;
        const nlsUrl = 'wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1';
        return new Promise((resolve, reject) => {
            const nlsSocket = new ws_1.default(nlsUrl, {
                headers: { 'X-NLS-Token': token },
            });
            nlsSocket.on('open', () => {
                this.logger.log('NLS WebSocket connected for voice call');
                const taskId = this.generateId();
                const appkey = this.voiceCallService.getAppKey();
                const startMsg = {
                    header: {
                        message_id: this.generateId(),
                        task_id: taskId,
                        namespace: 'SpeechRecognizer',
                        name: 'StartRecognition',
                        appkey,
                    },
                    payload: {
                        format: 'pcm',
                        sample_rate: 16000,
                        enable_intermediate_result: true,
                        enable_punctuation_prediction: true,
                        enable_inverse_text_normalization: true,
                    },
                };
                const state = this.clientStates.get(client.id);
                if (state) {
                    state.nlsTaskId = taskId;
                }
                this.logger.log(`NLS StartRecognition: appkey=${appkey}, taskId=${taskId}`);
                nlsSocket.send(JSON.stringify(startMsg));
                resolve(nlsSocket);
            });
            nlsSocket.on('message', (data, isBinary) => {
                if (isBinary) {
                    this.logger.log(`NLS binary message received, size: ${data.length}`);
                    return;
                }
                try {
                    const msg = JSON.parse(data.toString());
                    const msgName = msg.header?.name || 'unknown';
                    const statusText = msg.header?.status_text || msg.header?.status_message || '';
                    this.logger.log(`NLS message: ${msgName} ${statusText ? '(' + statusText + ')' : ''}`);
                    if (msgName !== 'RecognitionResultChanged') {
                        this.logger.log(`NLS full message: ${JSON.stringify(msg).substring(0, 500)}`);
                    }
                    this.handleNLSMessage(client, msg);
                }
                catch (err) {
                    this.logger.warn(`NLS message parse error: ${err.message}`);
                }
            });
            nlsSocket.on('error', (err) => {
                this.logger.error(`NLS WebSocket error: ${err.message}`);
                reject(err);
            });
            nlsSocket.on('close', (code, reason) => {
                this.logger.log(`NLS WebSocket closed: code=${code}, reason=${reason}`);
                const state = this.clientStates.get(client.id);
                if (state) {
                    state.nlsSocket = null;
                    state.isNlsReady = false;
                }
            });
            setTimeout(() => {
                if (nlsSocket.readyState !== ws_1.default.OPEN) {
                    this.logger.error('NLS WebSocket connection timeout');
                    nlsSocket.close();
                    reject(new Error('NLS connection timeout'));
                }
            }, 10000);
        });
    }
    handleNLSMessage(client, msg) {
        const name = msg.header?.name;
        const state = this.clientStates.get(client.id);
        if (!state)
            return;
        if (name === 'RecognitionStarted') {
            this.logger.log('NLS Recognition started (voice call)');
            state.isNlsReady = true;
        }
        else if (name === 'RecognitionResultChanged') {
            const text = msg.payload?.result || '';
            if (!text)
                return;
            if (state.isProcessing)
                return;
            if (state.isAiSpeaking && !state.isInterrupted && text.length >= 4) {
                const prevText = state.lastInterimText || '';
                const isNewSpeech = text.length > prevText.length + 2 || !text.startsWith(prevText.substring(0, 5));
                if (isNewSpeech) {
                    this.logger.log(`User interrupted AI speech with: ${text.substring(0, 30)}`);
                    state.isInterrupted = true;
                    state.isAiSpeaking = false;
                    client.emit('ai-interrupted');
                }
            }
            client.emit('interim-result', { text });
            state.lastInterimText = text;
            if (state.silenceTimer)
                clearTimeout(state.silenceTimer);
            state.silenceTimer = setTimeout(() => {
                if (state.lastInterimText && state.isInCall && !state.isProcessing && !state.isAiSpeaking) {
                    this.logger.log(`Silence detected, force completing with: ${state.lastInterimText}`);
                    const finalText = state.lastInterimText;
                    state.lastInterimText = '';
                    state.isProcessing = true;
                    client.emit('user-speech', { text: finalText });
                    state.conversationHistory.push({ role: 'user', content: finalText });
                    this.processUserUtterance(client, finalText);
                }
            }, 3000);
        }
        else if (name === 'RecognitionCompleted') {
            if (state.silenceTimer)
                clearTimeout(state.silenceTimer);
            if (state.isProcessing) {
                this.logger.log('RecognitionCompleted ignored (already processing)');
                return;
            }
            const text = msg.payload?.result || '';
            if (text && text.trim()) {
                this.logger.log(`User speech: ${text}`);
                state.isProcessing = true;
                state.lastInterimText = '';
                client.emit('user-speech', { text });
                state.conversationHistory.push({ role: 'user', content: text });
                this.processUserUtterance(client, text);
            }
        }
        else if (name === 'TaskFailed') {
            const statusText = msg.header?.status_text || msg.header?.status_message || 'Unknown error';
            this.logger.error(`NLS Task failed: ${statusText} | full: ${JSON.stringify(msg)}`);
            client.emit('recognition-error', {
                message: statusText,
            });
        }
    }
    async processUserUtterance(client, userText) {
        const state = this.clientStates.get(client.id);
        if (!state)
            return;
        state.isInterrupted = false;
        state.isAiSpeaking = true;
        state.fullAiResponse = '';
        client.emit('ai-thinking');
        try {
            const messages = this.voiceCallService.buildMessages(state.conversationHistory);
            let tokenBuffer = '';
            let sentenceBuffer = '';
            const ttsPromises = [];
            let ttsSuccessCount = 0;
            for await (const token of this.voiceCallService.streamChat(messages)) {
                if (state.isInterrupted || !state.isInCall) {
                    this.logger.log('LLM stream interrupted');
                    break;
                }
                tokenBuffer += token;
                state.fullAiResponse += token;
                sentenceBuffer += token;
                if (state.isInCall) {
                    client.emit('ai-text-chunk', { text: token });
                }
                const { complete, remainder } = this.voiceCallService.splitIntoSentences(sentenceBuffer);
                sentenceBuffer = remainder;
                for (const sentence of complete) {
                    if (!state.isInCall || state.isInterrupted)
                        break;
                    const ttsPromise = this.ttsAndSend(client, state, sentence).then(ok => { if (ok)
                        ttsSuccessCount++; });
                    ttsPromises.push(ttsPromise);
                }
            }
            if (sentenceBuffer.trim() && state.isInCall && !state.isInterrupted) {
                ttsPromises.push(this.ttsAndSend(client, state, sentenceBuffer.trim()).then(ok => { if (ok)
                    ttsSuccessCount++; }));
            }
            await Promise.all(ttsPromises);
            if (ttsSuccessCount === 0 && state.fullAiResponse && state.isInCall && !state.isInterrupted) {
                this.logger.log('All TTS failed, sending full text for client-side speech synthesis');
                client.emit('ai-speech', { text: state.fullAiResponse });
            }
            if (state.fullAiResponse && !state.isInterrupted && state.isInCall) {
                state.conversationHistory.push({
                    role: 'assistant',
                    content: state.fullAiResponse,
                });
            }
            state.isAiSpeaking = false;
            state.isProcessing = false;
            state.lastInterimText = '';
        }
        catch (err) {
            this.logger.error(`Process utterance error: ${err.message}`);
            state.isAiSpeaking = false;
            state.isProcessing = false;
            state.lastInterimText = '';
            client.emit('ai-done');
        }
    }
    async ttsAndSend(client, state, text) {
        if (!state.isInCall || state.isInterrupted)
            return false;
        try {
            this.logger.log(`TTS sentence: ${text.substring(0, 30)}`);
            const audioBase64 = await this.callEdgeTTS(text);
            if (!state.isInCall || state.isInterrupted)
                return false;
            if (audioBase64) {
                client.emit('ai-speech-chunk', { audio: audioBase64, text });
                return true;
            }
            return false;
        }
        catch (err) {
            this.logger.error(`TTS sentence error: ${err.message}`);
            return false;
        }
    }
    callEdgeTTS(text) {
        return new Promise((resolve, reject) => {
            const ttsScript = path.join(process.cwd(), 'tts_server.py');
            const python = process.env.PYTHON || 'python';
            this.logger.log(`Edge TTS call: text="${text.substring(0, 20)}", script=${ttsScript}`);
            const child = (0, child_process_1.execFile)(python, [ttsScript], {
                timeout: 30000,
                maxBuffer: 10 * 1024 * 1024,
            }, (error, stdout, stderr) => {
                if (error) {
                    this.logger.error(`Edge TTS exec error: ${error.message}`);
                    if (stderr)
                        this.logger.error(`Edge TTS stderr: ${stderr.substring(0, 300)}`);
                    reject(error);
                    return;
                }
                const result = stdout.trim();
                this.logger.log(`Edge TTS success: ${result.length} chars`);
                resolve(result);
            });
            if (child.stdin) {
                child.stdin.write(text);
                child.stdin.end();
            }
            else {
                this.logger.error('Edge TTS: child.stdin is null');
                reject(new Error('stdin is null'));
            }
        });
    }
    handleAudioData(client, data) {
        const state = this.clientStates.get(client.id);
        if (!state)
            return;
        if (!state.isInCall)
            return;
        if (!state.nlsSocket || state.nlsSocket.readyState !== ws_1.default.OPEN) {
            return;
        }
        try {
            const pcmBuffer = Buffer.from(data, 'base64');
            state.nlsSocket.send(pcmBuffer);
        }
        catch (err) {
            this.logger.warn(`Audio data error: ${err.message}`);
        }
    }
    handleInterrupt(client) {
        const state = this.clientStates.get(client.id);
        if (!state)
            return;
        if (state.isAiSpeaking) {
            state.isInterrupted = true;
            state.isAiSpeaking = false;
            client.emit('ai-interrupted');
        }
    }
    handleAiDone(client) {
        const state = this.clientStates.get(client.id);
        if (!state)
            return;
        state.isAiSpeaking = false;
        this.logger.log('Client reported AI playback finished');
    }
    async handleEndCall(client) {
        this.logger.log(`End voice call for ${client.id}`);
        const state = this.clientStates.get(client.id);
        if (!state)
            return;
        state.isInCall = false;
        state.isAiSpeaking = false;
        state.isProcessing = false;
        state.isInterrupted = true;
        state.isNlsReady = false;
        if (state.silenceTimer) {
            clearTimeout(state.silenceTimer);
            state.silenceTimer = null;
        }
        if (state.nlsSocket && state.nlsSocket.readyState === ws_1.default.OPEN) {
            const stopMsg = {
                header: {
                    message_id: this.generateId(),
                    task_id: state.nlsTaskId,
                    namespace: 'SpeechRecognizer',
                    name: 'StopRecognition',
                    appkey: this.voiceCallService.getAppKey(),
                },
                payload: {},
            };
            state.nlsSocket.send(JSON.stringify(stopMsg));
            state.nlsSocket.close();
            state.nlsSocket = null;
        }
        client.emit('call-ended', {
            transcript: state.conversationHistory,
        });
    }
    generateId() {
        return (0, uuid_1.v4)().split('-').join('');
    }
};
exports.VoiceCallGateway = VoiceCallGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], VoiceCallGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('start-call'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], VoiceCallGateway.prototype, "handleStartCall", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('audio-data'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], VoiceCallGateway.prototype, "handleAudioData", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('interrupt'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], VoiceCallGateway.prototype, "handleInterrupt", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('ai-done'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], VoiceCallGateway.prototype, "handleAiDone", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('end-call'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], VoiceCallGateway.prototype, "handleEndCall", null);
exports.VoiceCallGateway = VoiceCallGateway = VoiceCallGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: '*' },
        namespace: '/voice-call',
    }),
    __metadata("design:paramtypes", [voice_call_service_1.VoiceCallService])
], VoiceCallGateway);
//# sourceMappingURL=voice-call.gateway.js.map