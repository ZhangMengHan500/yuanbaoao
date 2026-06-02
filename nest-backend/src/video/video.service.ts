import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SiliconFlowVideo } from './siliconflow-video';

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  // 任务订阅者 (clientId → Set<jobId>)
  private subscribers = new Map<string, Set<string>>();
  // jobId → Set<clientId>
  private jobSubscribers = new Map<string, Set<string>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly siliconFlowVideo: SiliconFlowVideo,
  ) {}

  /**
   * 创建视频生成任务
   */
  async createJob(userId: string, params: {
    prompt: string;
    inputImageUrl?: string;
    resolution?: string;
    negativePrompt?: string;
  }) {
    const jobType = params.inputImageUrl ? 'img2vid' : 'txt2vid';
    const resolution = params.resolution || '1280x720';

    // 写入数据库
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

    // 异步提交到 SiliconFlow（不阻塞响应）
    this.submitToSiliconFlow(job.id, params).catch(err => {
      this.logger.error(`Submit to SiliconFlow failed: ${err.message}`);
    });

    return job;
  }

  /**
   * 提交任务到 SiliconFlow
   */
  private async submitToSiliconFlow(jobId: string, params: {
    prompt: string;
    inputImageUrl?: string;
    resolution?: string;
  }) {
    try {
      const result = await this.siliconFlowVideo.submitTask({
        prompt: params.prompt,
        inputImageUrl: params.inputImageUrl,
        resolution: params.resolution,
      });

      // 更新任务状态
      await this.prisma.videoJob.update({
        where: { id: jobId },
        data: {
          externalTaskId: result.taskId,
          status: 'processing',
        },
      });

      this.logger.log(`Video job submitted to SiliconFlow: jobId=${jobId}, taskId=${result.taskId}`);

      // 启动轮询
      this.pollJobStatus(jobId, result.taskId);
    } catch (err) {
      await this.prisma.videoJob.update({
        where: { id: jobId },
        data: { status: 'failed', errorMsg: err.message },
      });
    }
  }

  /**
   * 轮询任务状态
   */
  private async pollJobStatus(jobId: string, externalTaskId: string) {
    const maxAttempts = 120; // 最多轮询 120 次 (约 6 分钟)
    const interval = 3000; // 3 秒一次

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, interval));

      try {
        const status = await this.siliconFlowVideo.checkStatus(externalTaskId);

        if (status.status === 'completed' && status.videoUrl) {
          // 下载视频
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

        // 仍在处理中，通知订阅者进度
        const percent = status.progress || Math.min(95, Math.round((i / maxAttempts) * 100));
        this.notifySubscribers(jobId, 'processing', percent, '视频生成中...');
      } catch (err) {
        this.logger.warn(`Poll error for job ${jobId}: ${err.message}`);
      }
    }

    // 超时
    await this.prisma.videoJob.update({
      where: { id: jobId },
      data: { status: 'failed', errorMsg: '生成超时' },
    });
    this.notifySubscribers(jobId, 'failed', 0, '生成超时');
  }

  /**
   * 查询任务状态
   */
  async getJob(jobId: string) {
    return this.prisma.videoJob.findUnique({ where: { id: jobId } });
  }

  /**
   * 获取用户任务列表
   */
  async getUserJobs(userId: string, page = 1, pageSize = 20) {
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

  /**
   * 订阅任务进度
   */
  subscribe(clientId: string, jobId: string) {
    if (!this.subscribers.has(clientId)) {
      this.subscribers.set(clientId, new Set());
    }
    this.subscribers.get(clientId)!.add(jobId);

    if (!this.jobSubscribers.has(jobId)) {
      this.jobSubscribers.set(jobId, new Set());
    }
    this.jobSubscribers.get(jobId)!.add(clientId);
  }

  /**
   * 取消订阅
   */
  unsubscribe(clientId: string) {
    const jobs = this.subscribers.get(clientId);
    if (jobs) {
      for (const jobId of jobs) {
        this.jobSubscribers.get(jobId)?.delete(clientId);
      }
    }
    this.subscribers.delete(clientId);
  }

  /**
   * 通知订阅者
   */
  private notifySubscribers(jobId: string, status: string, percent: number, message: string) {
    const clientIds = this.jobSubscribers.get(jobId);
    if (!clientIds) return;

    // 通过 gateway 推送，这里只记录日志
    this.logger.log(`Progress update: job=${jobId}, status=${status}, percent=${percent}`);
  }
}
