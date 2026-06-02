"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartEditModule = void 0;
const common_1 = require("@nestjs/common");
const smart_edit_controller_1 = require("./smart-edit.controller");
const smart_edit_service_1 = require("./smart-edit.service");
const siliconflow_provider_1 = require("./siliconflow.provider");
const prisma_module_1 = require("../prisma/prisma.module");
const llm_module_1 = require("../llm/llm.module");
let SmartEditModule = class SmartEditModule {
};
exports.SmartEditModule = SmartEditModule;
exports.SmartEditModule = SmartEditModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, llm_module_1.LlmModule],
        controllers: [smart_edit_controller_1.SmartEditController],
        providers: [
            smart_edit_service_1.SmartEditService,
            { provide: 'IMAGE_GEN_PROVIDER', useClass: siliconflow_provider_1.SiliconFlowProvider },
        ],
        exports: [smart_edit_service_1.SmartEditService],
    })
], SmartEditModule);
//# sourceMappingURL=smart-edit.module.js.map