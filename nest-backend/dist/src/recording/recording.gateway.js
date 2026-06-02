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
var RecordingGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordingGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const recording_service_1 = require("./recording.service");
const ws_1 = __importDefault(require("ws"));
const uuid_1 = require("uuid");
let RecordingGateway = RecordingGateway_1 = class RecordingGateway {
    constructor(recordingService) {
        this.recordingService = recordingService;
        this.logger = new common_1.Logger(RecordingGateway_1.name);
        this.clientStates = new Map();
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
        this.clientStates.set(client.id, {
            nlsSocket: null,
            nlsTaskId: null,
            isRecognizing: false,
            isStopping: false,
            fullText: '',
            audioChunks: [],
        });
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        const state = this.clientStates.get(client.id);
        if (state?.nlsSocket) {
            state.nlsSocket.close();
        }
        this.clientStates.delete(client.id);
    }
    async handleStartRecognition(client, data) {
        this.logger.log(`Start recognition for ${client.id}`);
        const state = this.clientStates.get(client.id);
        if (!state)
            return;
        state.fullText = '';
        state.audioChunks = [];
        state.isRecognizing = true;
        try {
            const tokenInfo = await this.recordingService.getNLSToken();
            if (!tokenInfo) {
                this.logger.warn('NLS Token 获取失败，使用模拟识别模式');
                client.emit('recognition-mode', { mode: 'simulation' });
                return;
            }
            const nlsSocket = await this.connectToNLS(client, tokenInfo);
            state.nlsSocket = nlsSocket;
            client.emit('recognition-mode', { mode: 'realtime' });
        }
        catch (err) {
            this.logger.error(`Start recognition failed: ${err.message}`);
            client.emit('recognition-mode', { mode: 'simulation' });
        }
    }
    async connectToNLS(client, tokenInfo) {
        const { token, appId } = tokenInfo;
        const nlsUrl = 'wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1';
        return new Promise((resolve, reject) => {
            const nlsSocket = new ws_1.default(nlsUrl, {
                headers: {
                    'X-NLS-Token': token,
                },
            });
            nlsSocket.on('open', () => {
                this.logger.log('NLS WebSocket connected');
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
                const state = this.clientStates.get(client.id);
                if (state) {
                    state.nlsTaskId = startMsg.header.task_id;
                }
                nlsSocket.send(JSON.stringify(startMsg));
                resolve(nlsSocket);
            });
            nlsSocket.on('message', (data, isBinary) => {
                if (!isBinary) {
                    try {
                        const msg = JSON.parse(data.toString());
                        this.handleNLSMessage(client, msg);
                    }
                    catch { }
                }
            });
            nlsSocket.on('error', (err) => {
                this.logger.error(`NLS WebSocket error: ${err.message}`);
                reject(err);
            });
            nlsSocket.on('close', () => {
                this.logger.log('NLS WebSocket closed');
                const state = this.clientStates.get(client.id);
                if (state?.isStopping) {
                    state.isStopping = false;
                    this.logger.log(`Sending recognition-complete, fullText length: ${state.fullText.length}`);
                    client.emit('recognition-complete', {
                        fullText: state.fullText || '',
                    });
                }
            });
        });
    }
    handleNLSMessage(client, msg) {
        const name = msg.header?.name;
        if (name === 'RecognitionStarted') {
            this.logger.log('NLS Recognition started');
            client.emit('recognition-started');
        }
        else if (name === 'RecognitionResultChanged') {
            const text = msg.payload?.result || '';
            const sentenceId = msg.payload?.sentence_id || 0;
            client.emit('interim-result', {
                text,
                sentenceId,
                isFinal: false,
            });
        }
        else if (name === 'RecognitionCompleted') {
            const text = msg.payload?.result || '';
            const state = this.clientStates.get(client.id);
            if (state) {
                state.fullText += text;
            }
            client.emit('final-result', {
                text,
                fullText: state?.fullText || text,
            });
        }
        else if (name === 'TaskFailed') {
            this.logger.error(`NLS Task failed: ${JSON.stringify(msg)}`);
            client.emit('recognition-error', {
                message: msg.header?.status_message || 'Recognition failed',
            });
        }
    }
    handleAudioData(client, data) {
        const state = this.clientStates.get(client.id);
        if (!state?.isRecognizing)
            return;
        if (state.nlsSocket && state.nlsSocket.readyState === ws_1.default.OPEN) {
            const pcmBuffer = Buffer.from(data, 'base64');
            state.nlsSocket.send(pcmBuffer);
        }
        else {
            state.audioChunks.push(Buffer.from(data, 'base64'));
        }
    }
    async handleStopRecognition(client) {
        this.logger.log(`Stop recognition for ${client.id}`);
        const state = this.clientStates.get(client.id);
        if (!state)
            return;
        state.isRecognizing = false;
        if (state.nlsSocket && state.nlsSocket.readyState === ws_1.default.OPEN) {
            state.isStopping = true;
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
            setTimeout(() => {
                if (state.isStopping) {
                    state.isStopping = false;
                    this.logger.log(`NLS close timeout, force sending recognition-complete`);
                    client.emit('recognition-complete', {
                        fullText: state.fullText || '',
                    });
                    if (state.nlsSocket) {
                        state.nlsSocket.close();
                        state.nlsSocket = null;
                    }
                }
            }, 5000);
        }
        else {
            client.emit('recognition-complete', {
                fullText: state.fullText || '',
            });
        }
    }
    async handleSimulateRecognition(client, data) {
        this.logger.log(`Simulate recognition for ${client.id}`);
        const state = this.clientStates.get(client.id);
        if (!state)
            return;
        const fullText = this.recordingService.getSimulatedText();
        let currentText = '';
        for (let i = 0; i < fullText.length; i++) {
            currentText += fullText[i];
            client.emit('interim-result', {
                text: currentText,
                sentenceId: 0,
                isFinal: i === fullText.length - 1,
            });
            await this.sleep(50);
        }
        state.fullText = fullText;
        client.emit('final-result', { text: fullText, fullText });
        client.emit('recognition-complete', { fullText });
    }
    generateId() {
        return (0, uuid_1.v4)().split('-').join('');
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.RecordingGateway = RecordingGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], RecordingGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('start-recognition'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RecordingGateway.prototype, "handleStartRecognition", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('audio-data'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], RecordingGateway.prototype, "handleAudioData", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('stop-recognition'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], RecordingGateway.prototype, "handleStopRecognition", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('simulate-recognition'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RecordingGateway.prototype, "handleSimulateRecognition", null);
exports.RecordingGateway = RecordingGateway = RecordingGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: '*' },
        namespace: '/recording',
    }),
    __metadata("design:paramtypes", [recording_service_1.RecordingService])
], RecordingGateway);
//# sourceMappingURL=recording.gateway.js.map