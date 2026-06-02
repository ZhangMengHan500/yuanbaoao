"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BufferMemoryService = void 0;
const common_1 = require("@nestjs/common");
let BufferMemoryService = class BufferMemoryService {
    constructor() {
        this.store = new Map();
    }
    async getHistory(sessionId, maxMessages = 20) {
        const messages = this.store.get(sessionId) || [];
        return messages.slice(-maxMessages);
    }
    async saveMessage(sessionId, message) {
        if (!this.store.has(sessionId)) {
            this.store.set(sessionId, []);
        }
        this.store.get(sessionId).push(message);
    }
    async clearHistory(sessionId) {
        this.store.delete(sessionId);
    }
    getMemoryType() {
        return 'buffer-memory';
    }
    getSessionCount() {
        return this.store.size;
    }
};
exports.BufferMemoryService = BufferMemoryService;
exports.BufferMemoryService = BufferMemoryService = __decorate([
    (0, common_1.Injectable)()
], BufferMemoryService);
//# sourceMappingURL=buffer-memory.service.js.map