"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var TranslateGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslateGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const translate_service_1 = require("./translate.service");
const recording_service_1 = require("../recording/recording.service");
const ws_1 = __importDefault(require("ws"));
const uuid_1 = require("uuid");
let TranslateGateway = TranslateGateway_1 = class TranslateGateway {
    constructor(translateService, recordingService) {
        this.translateService = translateService;
        this.recordingService = recordingService;
        this.logger = new common_1.Logger(TranslateGateway_1.name);
        this.clientStates = new Map();
    }
    generateId() {
        return (0, uuid_1.v4)().split('-').join('');
    }
    handleConnection(client) {
        this.logger.log(`Translate client connected: ${client.id}`);
        this.clientStates.set(client.id, {
            nlsSocket: null,
            nlsTaskId: null,
            isRecording: false,
            sourceLang: 'auto',
            targetLang: 'zh',
            enableTts: false,
            fullSource: '',
            fullTranslation: '',
        });
    }
    handleDisconnect(client) {
        this.logger.log(`Translate client disconnected: ${client.id}`);
        const state = this.clientStates.get(client.id);
        if (state?.nlsSocket) {
            state.nlsSocket.close();
        }
        this.clientStates.delete(client.id);
    }
    async handleStartTranslation(client, data) {
        const state = this.clientStates.get(client.id);
        if (!state)
            return;
        state.sourceLang = data.sourceLang || 'auto';
        state.targetLang = data.targetLang || 'zh';
        state.enableTts = data.enableTts || false;
        state.isRecording = true;
        state.fullSource = '';
        state.fullTranslation = '';
        this.logger.log(`开始同传: ${state.sourceLang} -> ${state.targetLang}, tts=${state.enableTts}`);
        try {
            const tokenInfo = await this.recordingService.getNLSToken();
            this.logger.log(`NLS Token 获取结果: ${tokenInfo ? '成功' : '失败'}, appId=${tokenInfo?.appId}`);
            if (!tokenInfo) {
                this.logger.warn('NLS Token 获取失败');
                client.emit('translation-error', { message: '语音识别服务不可用' });
                state.isRecording = false;
                return;
            }
            const nlsSocket = await this.connectToNLS(client, state, tokenInfo);
            state.nlsSocket = nlsSocket;
            client.emit('connection-established', {
                sourceLang: state.sourceLang,
                targetLang: state.targetLang,
            });
            this.logger.log('NLS 连接成功，同传翻译已启动');
        }
        catch (err) {
            this.logger.error(`同传 NLS 连接失败: ${err.message}`);
            client.emit('translation-error', { message: '语音识别连接失败' });
            state.isRecording = false;
        }
    }
    handleAudioData(client, data) {
        const state = this.clientStates.get(client.id);
        if (!state?.isRecording)
            return;
        if (state.nlsSocket && state.nlsSocket.readyState === ws_1.default.OPEN) {
            const pcmBuffer = Buffer.from(data, 'base64');
            state.nlsSocket.send(pcmBuffer);
        }
    }
    async handleStopTranslation(client) {
        const state = this.clientStates.get(client.id);
        if (!state)
            return;
        state.isRecording = false;
        if (state.nlsSocket && state.nlsTaskId && state.nlsSocket.readyState === ws_1.default.OPEN) {
            const stopMsg = {
                header: {
                    message_id: this.generateId(),
                    task_id: state.nlsTaskId,
                    namespace: 'SpeechRecognizer',
                    name: 'StopRecognition',
                    appkey: this.recordingService.getAppKey(),
                },
                payload: {},
            };
            state.nlsSocket.send(JSON.stringify(stopMsg));
            this.logger.log('已发送 StopRecognition');
        }
        else {
            client.emit('translation-complete', {
                fullSource: state.fullSource,
                fullTranslation: state.fullTranslation,
            });
        }
    }
    async connectToNLS(client, state, tokenInfo) {
        const { token } = tokenInfo;
        const nlsUrl = 'wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1';
        return new Promise((resolve, reject) => {
            const nlsSocket = new ws_1.default(nlsUrl, {
                headers: {
                    'X-NLS-Token': token,
                },
            });
            nlsSocket.on('open', () => {
                this.logger.log('Translate NLS WebSocket connected');
                const startMsg = {
                    header: {
                        message_id: this.generateId(),
                        task_id: this.generateId(),
                        namespace: 'SpeechRecognizer',
                        name: 'StartRecognition',
                        appkey: this.recordingService.getAppKey(),
                    },
                    payload: {
                        format: 'pcm',
                        sample_rate: 16000,
                        enable_intermediate_result: true,
                        enable_punctuation_prediction: true,
                        enable_inverse_text_normalization: true,
                    },
                    context: {
                        sdk: {
                            name: 'nls-nodejs-sdk',
                            version: '1.0.0',
                            language: 'nodejs',
                        },
                    },
                };
                state.nlsTaskId = startMsg.header.task_id;
                nlsSocket.send(JSON.stringify(startMsg));
                this.logger.log(`StartRecognition 已发送, taskId=${state.nlsTaskId}`);
                resolve(nlsSocket);
            });
            nlsSocket.on('message', (data, isBinary) => {
                if (!isBinary) {
                    try {
                        const msg = JSON.parse(data.toString());
                        this.handleNLSMessage(client, state, msg);
                    }
                    catch { }
                }
            });
            nlsSocket.on('error', (err) => {
                this.logger.error(`Translate NLS error: ${err.message}`);
                reject(err);
            });
            nlsSocket.on('close', () => {
                this.logger.log('Translate NLS WebSocket closed');
                state.nlsSocket = null;
                if (state.fullSource) {
                    client.emit('translation-complete', {
                        fullSource: state.fullSource,
                        fullTranslation: state.fullTranslation,
                    });
                }
            });
        });
    }
    handleNLSMessage(client, state, msg) {
        const name = msg.header?.name;
        if (name === 'RecognitionStarted') {
            this.logger.log('Translate NLS Recognition started');
        }
        else if (name === 'RecognitionResultChanged') {
            const text = msg.payload?.result || '';
            if (text) {
                client.emit('interim-result', {
                    text,
                    isFinal: false,
                });
            }
        }
        else if (name === 'RecognitionCompleted') {
            const text = msg.payload?.result || '';
            if (text) {
                state.fullSource += text;
                this.logger.log(`NLS 识别完成: "${text}"`);
                client.emit('interim-result', {
                    text,
                    isFinal: true,
                });
                this.translateSentence(client, state, text);
            }
        }
        else if (name === 'TaskFailed') {
            this.logger.error(`Translate NLS Task failed: ${JSON.stringify(msg)}`);
            this.logger.error(`TaskFailed details: code=${msg.header?.status_code}, message=${msg.header?.status_message}`);
            client.emit('translation-error', {
                message: `语音识别失败: ${msg.header?.status_message || 'unknown'}`,
            });
        }
        else {
            this.logger.log(`Translate NLS unknown message: ${name}, data=${JSON.stringify(msg).substring(0, 200)}`);
        }
    }
    async translateSentence(client, state, text) {
        try {
            const translated = await this.translateService.translateText(text, state.sourceLang, state.targetLang);
            state.fullTranslation += translated;
            client.emit('translation-result', {
                sourceText: text,
                translatedText: translated,
            });
            if (state.enableTts && translated) {
                try {
                    const audioBuffer = await this.recordingService.synthesizeSpeech(translated);
                    client.emit('audio-chunk', {
                        audioBase64: audioBuffer.toString('base64'),
                    });
                }
                catch (ttsError) {
                    this.logger.warn('TTS 合成失败:', ttsError.message);
                }
            }
        }
        catch (error) {
            this.logger.warn(`翻译失败: ${error.message}`);
        }
    }
};
exports.TranslateGateway = TranslateGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], TranslateGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('start-translation'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], TranslateGateway.prototype, "handleStartTranslation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('audio-data'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], TranslateGateway.prototype, "handleAudioData", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('stop-translation'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], TranslateGateway.prototype, "handleStopTranslation", null);
exports.TranslateGateway = TranslateGateway = TranslateGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: '*' },
        namespace: '/translate',
    }),
    __metadata("design:paramtypes", [translate_service_1.TranslateService,
        recording_service_1.RecordingService])
], TranslateGateway);
//# sourceMappingURL=translate.gateway.js.map