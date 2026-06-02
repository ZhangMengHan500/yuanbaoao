"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryModule = void 0;
const common_1 = require("@nestjs/common");
const buffer_memory_service_1 = require("./buffer-memory.service");
const redis_memory_service_1 = require("./redis-memory.service");
const postgres_memory_service_1 = require("./postgres-memory.service");
const memory_factory_1 = require("./memory.factory");
const prisma_module_1 = require("../prisma/prisma.module");
let MemoryModule = class MemoryModule {
};
exports.MemoryModule = MemoryModule;
exports.MemoryModule = MemoryModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        providers: [
            buffer_memory_service_1.BufferMemoryService,
            redis_memory_service_1.RedisMemoryService,
            postgres_memory_service_1.PostgresMemoryService,
            memory_factory_1.MemoryFactory,
        ],
        exports: [
            memory_factory_1.MemoryFactory,
            buffer_memory_service_1.BufferMemoryService,
            redis_memory_service_1.RedisMemoryService,
            postgres_memory_service_1.PostgresMemoryService,
        ],
    })
], MemoryModule);
//# sourceMappingURL=memory.module.js.map