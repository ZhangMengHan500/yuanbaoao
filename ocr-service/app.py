"""PaddleOCR 微服务 - 提供图片文字识别 API"""

import base64
import io
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from paddleocr import PaddleOCR

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 初始化 PaddleOCR（首次运行会自动下载模型）
logger.info("正在初始化 PaddleOCR...")
ocr = PaddleOCR(
    use_angle_cls=True,
    lang="ch",
    show_log=False,
    use_gpu=False,
)
logger.info("PaddleOCR 初始化完成")


@app.route("/ocr", methods=["POST"])
def ocr_recognize():
    """
    识别图片中的文字
    请求: { "image_base64": "base64编码的图片" }
    响应: { "text": "识别出的文字", "details": [...] }
    """
    try:
        data = request.get_json()
        image_base64 = data.get("image_base64", "")

        if not image_base64:
            return jsonify({"error": "缺少 image_base64 参数"}), 400

        # 如果是 data URL，去掉前缀
        if "," in image_base64 and image_base64.startswith("data:"):
            image_base64 = image_base64.split(",", 1)[1]

        image_bytes = base64.b64decode(image_base64)
        image_stream = io.BytesIO(image_bytes)

        # PaddleOCR 识别
        result = ocr.ocr(img=image_stream, cls=True)

        if not result or not result[0]:
            return jsonify({"text": "", "details": []})

        # 提取文字
        lines = []
        details = []
        for line in result[0]:
            box = line[0]
            text = line[1][0]
            confidence = float(line[1][1])
            lines.append(text)
            details.append({
                "text": text,
                "confidence": confidence,
                "box": box,
            })

        full_text = "\n".join(lines)
        logger.info(f"OCR 识别完成, 共 {len(lines)} 行文字")

        return jsonify({
            "text": full_text,
            "details": details,
        })

    except Exception as e:
        logger.error(f"OCR 识别失败: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "paddleocr"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
