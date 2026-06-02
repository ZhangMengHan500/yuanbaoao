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
var VideoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const siliconflow_video_1 = require("./siliconflow-video");
let VideoService = VideoService_1 = class VideoService {
    constructor(prisma, siliconFlowVideo) {
        this.prisma = prisma;
        this.siliconFlowVideo = siliconFlowVideo;
        this.logger = new common_1.Logger(VideoService_1.name);
        this.subscribers = new Map();
        this.jobSubscribers = new Map();
    }
    async createJob(userId, params) {
        const jobType = params.inputImageUrl ? 'img2vid' : 'txt2vid';
        const resolution = params.resolution || '1280x720';
        const job = await this.prisma.videoJob.create({
            data: {
                userId,
                jobType,
                status: 'pending',
                prompt: params.prompt,
                negativePrompt: params.negativePrompt,
                inputImageUrl: params.inputImageUrl,
                resolution,
            },
        });
        this.logger.log(`Video job created: ${job.id}`);
        this.submitToSiliconFlow(job.id, params).catch(err => {
            this.logger.error(`Submit to SiliconFlow failed: ${err.message}`);
        });
        return job;
    }
    async submitToSiliconFlow(jobId, params) {
        try {
            const result = await this.siliconFlowVideo.submitTask({
                prompt: params.prompt,
                inputImageUrl: params.inputImageUrl,
                resolution: params.resolution,
            });
            await this.prisma.videoJob.update({
                where: { id: jobId },
                data: {
                    externalTaskId: result.taskId,
                    status: 'processing',
                },
            });
            this.logger.log(`Video job submitted to SiliconFlow: jobId=${jobId}, taskId=${result.taskId}`);
            this.pollJobStatus(jobId, result.taskId);
        }
        catch (err) {
            await this.prisma.videoJob.update({
                where: { id: jobId },
                data: { status: 'failed', errorMsg: err.message },
            });
        }
    }
    async pollJobStatus(jobId, externalTaskId) {
        const maxAttempts = 120;
        const interval = 3000;
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(r => setTimeout(r, interval));
            try {
                const status = await this.siliconFlowVideo.checkStatus(externalTaskId);
                if (status.status === 'completed' && status.videoUrl) {
                    const localPath = await this.siliconFlowVideo.downloadVideo(status.videoUrl);
                    await this.prisma.videoJob.update({
                        where: { id: jobId },
                        data: {
                            status: 'completed',
                            resultVideoUrl: localPath,
                        },
                    });
                    this.notifySubscribers(jobId, 'completed', 100, '视频生成完成');
                    this.logger.log(`Video job completed: ${jobId}`);
                    return;
                }
                if (status.status === 'failed') {
                    await this.prisma.videoJob.update({
                        where: { id: jobId },
                        data: { status: 'failed', errorMsg: status.errorMsg || '生成失败' },
                    });
                    this.notifySubscribers(jobId, 'failed', 0, status.errorMsg || '生成失败');
                    return;
                }
                const percent = status.progress || Math.min(95, Math.round((i / maxAttempts) * 100));
                this.notifySubscribers(jobId, 'processing', percent, '视频生成中...');
            }
            catch (err) {
                this.logger.warn(`Poll error for job ${jobId}: ${err.message}`);
            }
        }
        await this.prisma.videoJob.update({
            where: { id: jobId },
            data: { status: 'failed', errorMsg: '生成超时' },
        });
        this.notifySubscribers(jobId, 'failed', 0, '生成超时');
    }
    async getJob(jobId) {
        return this.prisma.videoJob.findUnique({ where: { id: jobId } });
    }
    async getUserJobs(userId, page = 1, pageSize = 20) {
        const skip = (page - 1) * pageSize;
        const [jobs, total] = await Promise.all([
            this.prisma.videoJob.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
            this.prisma.videoJob.count({ where: { userId } }),
        ]);
        return { jobs, total, page, pageSize };
    }
    subscribe(clientId, jobId) {
        if (!this.subscribers.has(clientId)) {
            this.subscribers.set(clientId, new Set());
        }
        this.subscribers.get(clientId).add(jobId);
        if (!this.jobSubscribers.has(jobId)) {
            this.jobSubscribers.set(jobId, new Set());
        }
        this.jobSubscribers.get(jobId).add(clientId);
    }
    unsubscribe(clientId) {
        const jobs = this.subscribers.get(clientId);
        if (jobs) {
            for (const jobId of jobs) {
                this.jobSubscribers.get(jobId)?.delete(clientId);
            }
        }
        this.subscribers.delete(clientId);
    }
    notifySubscribers(jobId, status, percent, message) {
        const clientIds = this.jobSubscribers.get(jobId);
        if (!clientIds)
            return;
        this.logger.log(`Progress update: job=${jobId}, status=${status}, percent=${percent}`);
    }
};
exports.VideoService = VideoService;
exports.VideoService = VideoService = VideoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        siliconflow_video_1.SiliconFlowVideo])
], VideoService);
//# sourceMappingURL=video.service.js.map