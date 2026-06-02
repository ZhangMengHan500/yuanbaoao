"""
本地 Stable Diffusion 1.5 img2img 推理服务
- FastAPI 提供 REST API
- SD 1.5 + float16 + attention slicing，适配 4GB 显存
- 每步回调推送进度到 NestJS 后端
"""

import io
import os
import base64
import uuid
import asyncio
import logging
from contextlib import asynccontextmanager

import torch
import aiohttp
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from diffusers import StableDiffusionImg2ImgPipeline

# ===== 配置 =====
MODEL_ID = "runwayml/stable-diffusion-v1-5"
OUTPUT_DIR = "./outputs"
NESTJS_CALLBACK_URL = os.getenv("NESTJS_CALLBACK_URL", "http://localhost:3000")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE = torch.float16 if DEVICE == "cuda" else torch.float32

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("img2img")

# ===== 全局变量 =====
pipe = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动时加载模型，关闭时释放资源"""
    global pipe
    logger.info(f"Loading SD 1.5 model on {DEVICE}...")
    logger.info("This may take a few minutes on first run (model download ~2GB)...")

    try:
        pipe = StableDiffusionImg2ImgPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=DTYPE,
            safety_checker=None,
            requires_safety_checker=False,
        )
        pipe.enable_attention_slicing()
        if DEVICE == "cuda":
            pipe.enable_model_cpu_offload()
        else:
            pipe = pipe.to(DEVICE)
        logger.info("SD 1.5 model loaded successfully!")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    yield
    logger.info("Shutting down, releasing GPU memory...")
    if pipe is not None:
        del pipe
        torch.cuda.empty_cache()


app = FastAPI(title="SD 1.5 img2img Service", lifespan=lifespan)


# ===== 工具函数 =====
async def notify_progress(job_id: str, step: int, total: int, status: str = "processing"):
    """回调 NestJS 更新进度"""
    try:
        async with aiohttp.ClientSession() as session:
            await session.post(
                f"{NESTJS_CALLBACK_URL}/create/img2img/callback",
                json={
                    "jobId": job_id,
                    "step": step,
                    "totalSteps": total,
                    "percent": round((step / total) * 100),
                    "status": status,
                },
                timeout=aiohttp.ClientTimeout(total=3),
            )
    except Exception as e:
        logger.warning(f"Progress callback failed: {e}")


def image_to_base64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


# ===== API 端点 =====
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "device": DEVICE,
        "model_loaded": pipe is not None,
    }


@app.post("/generate")
async def generate(
    image: UploadFile = File(..., description="参考图片"),
    prompt: str = Form(..., description="风格提示词"),
    negative_prompt: str = Form(default="", description="反向提示词"),
    strength: float = Form(default=0.75, description="重绘强度 0.0-1.0"),
    steps: int = Form(default=30, description="推理步数"),
    guidance_scale: float = Form(default=7.5, description="引导系数"),
    job_id: str = Form(default="", description="任务ID"),
    width: int = Form(default=512, description="输出宽度"),
    height: int = Form(default=512, description="输出高度"),
):
    if pipe is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    if not job_id:
        job_id = str(uuid.uuid4())

    try:
        # 读取参考图
        contents = await image.read()
        init_image = Image.open(io.BytesIO(contents)).convert("RGB")
        init_image = init_image.resize((width, height), Image.LANCZOS)

        logger.info(f"Job {job_id}: Generating with prompt='{prompt[:50]}...' strength={strength} steps={steps}")

        # 通知开始
        await notify_progress(job_id, 0, steps, "processing")

        # 定义进度回调
        step_count = [0]

        def step_callback(pipe_obj, step_index, timestep, callback_kwargs):
            step_count[0] = step_index + 1
            asyncio.run(notify_progress(job_id, step_count[0], steps))
            return callback_kwargs

        # 执行 img2img 推理
        result = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt if negative_prompt else None,
            image=init_image,
            strength=strength,
            num_inference_steps=steps,
            guidance_scale=guidance_scale,
            callback_on_step_end=step_callback,
        )

        output_image = result.images[0]

        # 保存到本地
        filename = f"{job_id}.png"
        filepath = os.path.join(OUTPUT_DIR, filename)
        output_image.save(filepath)

        # 转 base64 返回
        img_base64 = image_to_base64(output_image)

        # 通知完成
        await notify_progress(job_id, steps, steps, "completed")

        logger.info(f"Job {job_id}: Completed successfully")

        return JSONResponse({
            "success": True,
            "jobId": job_id,
            "imageUrl": f"/outputs/{filename}",
            "imageBase64": img_base64,
            "filepath": filepath,
        })

    except Exception as e:
        logger.error(f"Job {job_id}: Failed - {e}")
        await notify_progress(job_id, 0, steps, "failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/outputs/{filename}")
async def get_output(filename: str):
    """返回生成的图片文件"""
    filepath = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Image not found")
    from fastapi.responses import FileResponse
    return FileResponse(filepath, media_type="image/png")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
