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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OcrService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const pop_core_1 = __importDefault(require("@alicloud/pop-core"));
let OcrService = OcrService_1 = class OcrService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(OcrService_1.name);
        this.client = new pop_core_1.default({
            accessKeyId: this.configService.get('ALIBABA_ACCESS_KEY_ID') || '',
            accessKeySecret: this.configService.get('ALIBABA_ACCESS_KEY_SECRET') || '',
            endpoint: 'https://ocr-api.cn-hangzhou.aliyuncs.com',
            apiVersion: '2021-07-07',
        });
    }
    async recognizeText(imageBase64) {
        try {
            const params = {
                ImageBase64: imageBase64,
            };
            const result = await this.client.request('RecognizeGeneral', params, {
                method: 'POST',
                formatParams: false,
            });
            const data = result;
            if (data?.Data?.Content) {
                return data.Data.Content;
            }
            this.logger.warn('OCR 返回无文字内容');
            return '';
        }
        catch (error) {
            this.logger.error('OCR 识别失败:', error.message);
            return '';
        }
    }
};
exports.OcrService = OcrService;
exports.OcrService = OcrService = OcrService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OcrService);
//# sourceMappingURL=ocr.service.js.map