"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MockImageGenProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockImageGenProvider = void 0;
const common_1 = require("@nestjs/common");
let MockImageGenProvider = MockImageGenProvider_1 = class MockImageGenProvider {
    constructor() {
        this.logger = new common_1.Logger(MockImageGenProvider_1.name);
    }
    async generateImage(prompt, options) {
        this.logger.log(`[MOCK] 生成图片，prompt: ${prompt.substring(0, 80)}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        const w = options?.width || 512;
        const h = options?.height || 512;
        return {
            imageUrl: `https://placehold.co/${w}x${h}/1a1a2e/7c6aef?text=AI+Generated`,
            status: 'completed',
        };
    }
};
exports.MockImageGenProvider = MockImageGenProvider;
exports.MockImageGenProvider = MockImageGenProvider = MockImageGenProvider_1 = __decorate([
    (0, common_1.Injectable)()
], MockImageGenProvider);
//# sourceMappingURL=image-gen.provider.js.map