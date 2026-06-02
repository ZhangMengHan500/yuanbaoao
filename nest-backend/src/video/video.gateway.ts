import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { VideoService } from './video.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/video-progress',
})
export class VideoProgressGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(VideoProgressGateway.name);

  @WebSocketServer()
  server: Server;

  // clientId → Set<jobId>
  private clientSubscriptions = new Map<string, Set<string>>();
  // jobId → Set<clientId>
  private jobSubscriptions = new Map<string, Set<string>>();
  // 轮询定时器
  private pollTimers = new Map<string, ReturnType<typeof setInterval>>();

  constructor(private readonly videoService: VideoService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Video progress client connected: ${client.id}`);
    this.clientSubscriptions.set(client.id, new Set());
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Video progress client disconnected: ${client.id}`);

    // 清理订阅
    const jobs = this.clientSubscriptions.get(client.id);
    if (jobs) {
      for (const jobId of jobs) {
        const subs = this.jobSubscriptions.get(jobId);
        subs?.delete(client.id);
        if (subs?.size === 0) {
          this.jobSubscriptions.delete(jobId);
          this.stopPolling(jobId);
        }
      }
    }
    this.clientSubscriptions.delete(client.id);
  }

  /**
   * 客户端订阅任务进度
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string },
  ) {
    const { jobId } = data;
    if (!jobId) return;

    this.logger.log(`Client ${client.id} subscribing to job ${jobId}`);

    // 添加订阅
    if (!this.clientSubscriptions.has(client.id)) {
      this.clientSubscriptions.set(client.id, new Set());
    }
    this.clientSubscriptions.get(client.id)!.add(jobId);

    if (!this.jobSubscriptions.has(jobId)) {
      this.jobSubscriptions.set(jobId, new Set());
    }
    this.jobSubscriptions.get(jobId)!.add(client.id);

    // 如果是第一个订阅者，开始轮询
    if (this.jobSubscriptions.get(jobId)!.size === 1) {
      this.startPolling(jobId);
    }

    // 立即发送当前状态
    this.checkAndNotify(jobId);
  }

  /**
   * 客户端取消订阅
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string },
  ) {
    const { jobId } = data;
    this.clientSubscriptions.get(client.id)?.delete(jobId);

    const subs = this.jobSubscriptions.get(jobId);
    subs?.delete(client.id);
    if (subs?.size === 0) {
      this.jobSubscriptions.delete(jobId);
      this.stopPolling(jobId);
    }
  }

  /**
   * 开始轮询任务状态
   */
  private startPolling(jobId: string) {
    if (this.pollTimers.has(jobId)) return;

    const timer = setInterval(() => {
      this.checkAndNotify(jobId);
    }, 3000);

    this.pollTimers.set(jobId, timer);
  }

  /**
   * 停止轮询
   */
  private stopPolling(jobId: string) {
    const timer = this.pollTimers.get(jobId);
    if (timer) {
      clearInterval(timer);
      this.pollTimers.delete(jobId);
    }
  }

  /**
   * 检查任务状态并通知订阅者
   */
  private async checkAndNotify(jobId: string) {
    try {
      const job = await this.videoService.getJob(jobId);
      if (!job) return;

      // 计算进度百分比
      let percent = 0;
      if (job.status === 'completed') percent = 100;
      else if (job.status === 'failed') percent = 0;
      else if (job.status === 'processing') percent = 50; // 粗略估计

      // 通知所有订阅此任务的客户端
      const clientIds = this.jobSubscriptions.get(jobId);
      if (!clientIds) return;

      for (const clientId of clientIds) {
        this.server?.to(clientId).emit('progress-update', {
          jobId,
          status: job.status,
          percent,
          videoUrl: job.resultVideoUrl,
          errorMsg: job.errorMsg,
        });
      }

      // 完成或失败后停止轮询
      if (job.status === 'completed' || job.status === 'failed') {
        this.stopPolling(jobId);
      }
    } catch (err) {
      this.logger.warn(`Check notify error for job ${jobId}: ${err.message}`);
    }
  }
}
