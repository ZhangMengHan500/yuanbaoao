"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateModule = void 0;
const common_1 = require("@nestjs/common");
const create_controller_1 = require("./create.controller");
const create_service_1 = require("./create.service");
const img2img_controller_1 = require("./img2img.controller");
const img2img_service_1 = require("./img2img.service");
const siliconflow_provider_1 = require("./siliconflow.provider");
const prisma_module_1 = require("../prisma/prisma.module");
const llm_module_1 = require("../llm/llm.module");
let CreateModule = class CreateModule {
};
exports.CreateModule = CreateModule;
exports.CreateModule = CreateModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, llm_module_1.LlmModule],
        controllers: [create_controller_1.CreateController, img2img_controller_1.Img2ImgController],
        providers: [
            create_service_1.CreateService,
            img2img_service_1.Img2ImgService,
            { provide: 'IMAGE_GEN_PROVIDER', useClass: siliconflow_provider_1.SiliconFlowProvider },
        ],
        exports: [create_service_1.CreateService, img2img_service_1.Img2ImgService],
    })
], CreateModule);
//# sourceMappingURL=create.module.js.map