import warnings
warnings.filterwarnings('ignore')
import io
import base64
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ultralytics import YOLO
import cv2
import numpy as np

#membuat api
app = FastAPI(title="K3Guard ML Service")

#memuat model
MODEL_PATH = "../helmet_k3_model/weights/best.pt"
print(f"[ML SERVER] Memuat Model YOLOv8 dari {MODEL_PATH}...")
try:
    model = YOLO(MODEL_PATH)
    print("[ML SERVER] Model Berhasil Dimuat ✓")
except Exception as e:
    print(f"[ERROR] Gagal Memuat Model YOLO: {e}")
    model = None

CONF_THRESH = 0.45

class FrameRequest(BaseModel):
    image_base64: str

class BoundingBox(BaseModel):
    x1: float
    y1: float
    width: float
    height: float
    label: str
    confidence: float

class DetectionResponse(BaseModel):
    total: int
    safe: int
    danger: int
    confidence: float
    boxes: list[BoundingBox]

@app.get("/")
def read_root():
    return {"status": "Online", "model": str(model is not None)}

@app.post("/api/predict", response_model=DetectionResponse)
async def predict_frame(req: FrameRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model YOLO tidak ditemukan di path")

    try:
        base64_str = req.image_base64
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]

        img_bytes = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Gagal me-decode gambar Base64")

#proses deteksi 
        results = model(img, conf=CONF_THRESH, verbose=False)

        img_height, img_width = img.shape[:2]
        safe_count = 0
        danger_count = 0
        highest_conf = 0.0
        boxes_list = []

        for r in results:
            for box in r.boxes:
                cls = int(box.cls[0])
                label = model.names[cls]
                conf = float(box.conf[0])

                if conf > highest_conf:
                    highest_conf = conf

                if label == "safetyhelmet":
                    safe_count += 1
                elif label == "nohelmet":
                    danger_count += 1

                bx1, by1, bx2, by2 = map(float, box.xyxy[0])
                w = (bx2 - bx1) / img_width
                h = (by2 - by1) / img_height
                rx1 = bx1 / img_width
                ry1 = by1 / img_height

                boxes_list.append(BoundingBox(
                    x1=rx1,
                    y1=ry1,
                    width=w,
                    height=h,
                    label=label,
                    confidence=conf
                ))

        total = safe_count + danger_count
        
        conf_percent = highest_conf * 100 if total > 0 else 0.0

        return DetectionResponse(
            total=total,
            safe=safe_count,
            danger=danger_count,
            confidence=conf_percent,
            boxes=boxes_list
        )

    except Exception as e:
        print(f"Error predicting: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
