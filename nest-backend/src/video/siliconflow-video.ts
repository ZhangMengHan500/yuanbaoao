import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

const SILICONFLOW_API_BASE = 'https://api.siliconflow.cn/v1';
const SILICONFLOW_KEY = process.env.SILICONFLOW_API_KEY || '';
const OUTPUT_DIR = './uploads/videos';

// Wan2.2 模型（根据官方文档）
const MODEL_T2V = 'Wan-AI/Wan2.2-T2V-A14B';
const MODEL_I2V = 'Wan-AI/Wan2.2-I2V-A14B';

export interface VideoSubmitResult {
  taskId: string;
}

export interface VideoStatusResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  videoUrl?: string;
  errorMsg?: string;
}

@Injectable()
export class SiliconFlowVideo {
  private readonly logger = new Logger(SiliconFlowVideo.name);

  /**
   * 提交视频生成任务
   */
  async submitTask(params: {
    prompt: string;
    inputImageUrl?: string;
    resolution?: string; // "1280x720" | "720x1280" | "960x960"
    negativePrompt?: string;
    numFrames?: number; // 帧数
    fps?: number; // 帧率
    motionStrength?: number; // 运动强度
  }): Promise<VideoSubmitResult> {
    if (!SILICONFLOW_KEY) {
      throw new Error('SILICONFLOW_API_KEY 未配置');
    }

    const isImg2Vid = !!params.inputImageUrl;
    const model = isImg2Vid ? MODEL_I2V : MODEL_T2V;
    const resolution = params.resolution || '1280x720';
    const [width, height] = resolution.split('x').map(Number);

    const body: Record<string, any> = {
      model,
      prompt: params.prompt,
      image_size: `${width}x${height}`,
    };

    if (isImg2Vid && params.inputImageUrl) {
      // SiliconFlow I2V 需要 image_url
      body.image_url = params.inputImageUrl;
    }

    // 添加可选参数
    if (params.negativePrompt) {
      body.negative_prompt = params.negativePrompt;
    }
    if (params.numFrames) {
      body.num_frames = params.numFrames;
    }
    if (params.fps) {
      body.fps = params.fps;
    }
    if (params.motionStrength) {
      body.motion_strength = params.motionStrength;
    }

    this.logger.log(`Submitting video task: model=${model}, resolution=${resolution}, img2vid=${isImg2Vid}`);

    const response = await fetch(`${SILICONFLOW_API_BASE}/video/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SILICONFLOW_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`SiliconFlow video submit error: ${response.status}`);
      this.logger.error(`Request body: ${JSON.stringify(body)}`);
      this.logger.error(`Response: ${errText}`);
      throw new Error(`SiliconFlow API error: ${response.status} - ${errText}`);
    }

    const result = (await response.json()) as any;
    this.logger.log(`SiliconFlow video submit response: ${JSON.stringify(result)}`);
    const taskId = result.requestId || result.task_id || result.id;

    if (!taskId) {
      this.logger.error(`No requestId found. Full response: ${JSON.stringify(result)}`);
      throw new Error('No requestId in response');
    }

    this.logger.log(`Video task submitted: requestId=${taskId}`);
    return { taskId };
  }

  /**
   * 查询视频任务状态
   */
  async checkStatus(taskId: string): Promise<VideoStatusResult> {
    if (!SILICONFLOW_KEY) {
      throw new Error('SILICONFLOW_API_KEY 未配置');
    }

    const response = await fetch(`${SILICONFLOW_API_BASE}/video/status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SILICONFLOW_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId: taskId }),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`SiliconFlow video status error: ${response.status} - ${errText}`);
      throw new Error(`SiliconFlow API error: ${response.status}`);
    }

    const result = (await response.json()) as any;
    this.logger.log(`Video status: taskId=${taskId}, status=${result.status}`);

    if (result.status === 'Succeed') {
      // SiliconFlow 返回 results.videos 数组
      const videoUrl = result.results?.videos?.[0]?.url;
      return { status: 'completed', videoUrl };
    }

    if (result.status === 'Failed') {
      return { status: 'failed', errorMsg: result.reason || 'Video generation failed' };
    }

    // InProgress 或其他状态
    return {
      status: 'processing',
      progress: result.position || 0,
    };
  }

  /**
   * 下载视频保存到本地
   */
  async downloadVideo(url: string): Promise<string> {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const filename = `${Date.now()}_video.mp4`;
    const filepath = path.join(OUTPUT_DIR, filename);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    this.logger.log(`Video saved: ${filepath} (${buffer.length} bytes)`);
    return `/uploads/videos/${filename}`;
  }

  /**
   * 图片 URL 转 base64
   */
  private async imageToBase64(imageSource: string): Promise<string | null> {
    try {
      let buffer: Buffer;

      if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
        const res = await fetch(imageSource);
        if (!res.ok) return null;
        buffer = Buffer.from(await res.arrayBuffer());
      } else if (fs.existsSync(imageSource)) {
        buffer = fs.readFileSync(imageSource);
      } else {
        return null;
      }

      const ext = path.extname(imageSource).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
      };
      const mime = mimeMap[ext] || 'image/png';

      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch {
      return null;
    }
  }
}
