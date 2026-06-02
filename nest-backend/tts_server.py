"""简易 TTS 服务 — 使用 edge-tts (Microsoft)"""
import sys
import asyncio
import edge_tts
import base64
import json
import os

# 音色映射表：显示名称 -> Edge-TTS Voice ID
VOICE_MAP = {
    "七七": "zh-CN-XiaoxiaoNeural",   # 温暖亲切（默认）
    "甜甜": "zh-CN-XiaoyiNeural",     # 活泼可爱
    "酷酷": "zh-CN-YunxiNeural",      # 年轻阳光
}

async def tts(text: str, voice_name: str = "七七") -> str:
    """将文本转为 base64 编码的 MP3 音频"""
    # 根据音色名称获取对应的Voice ID
    voice = VOICE_MAP.get(voice_name, "zh-CN-XiaoxiaoNeural")
    # 清理非法字符
    text = text.encode("utf-8", errors="ignore").decode("utf-8")
    communicate = edge_tts.Communicate(text, voice)
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
    return base64.b64encode(audio_data).decode("utf-8")

if __name__ == "__main__":
    # 从stdin读取JSON格式的输入
    input_data = sys.stdin.buffer.read().decode("utf-8", errors="ignore").strip()
    if input_data:
        try:
            params = json.loads(input_data)
            text = params.get("text", "")
            voice_name = params.get("voice", "七七")
        except json.JSONDecodeError:
            text = input_data
            voice_name = "七七"

        if text:
            result = asyncio.run(tts(text, voice_name))
            print(result)
