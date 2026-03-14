import cv2
import numpy as np
from ultralytics import YOLO
from datetime import datetime

MODEL_PATH   = "helmet_k3_model/weights/best.pt"
CONF_THRESH  = 0.45
CAM_INDEX    = 0

CLR_GREEN    = (50,  205,  50)
CLR_RED      = (45,   45, 220)
CLR_YELLOW   = (0,   200, 220)
CLR_BG       = (18,   18,  18)
CLR_PANEL    = (28,   28,  30)
CLR_WHITE    = (240, 240, 240)
CLR_GRAY     = (120, 120, 120)
CLR_ACCENT   = (0,   160, 255)

FONT         = cv2.FONT_HERSHEY_DUPLEX
FONT_MONO    = cv2.FONT_HERSHEY_SIMPLEX


def rounded_rect(img, pt1, pt2, color, radius=12, thickness=-1, alpha=1.0):
    x1, y1 = pt1
    x2, y2 = pt2
    overlay = img.copy()
    cv2.rectangle(overlay, (x1+radius, y1), (x2-radius, y2), color, thickness)
    cv2.rectangle(overlay, (x1, y1+radius), (x2, y2-radius), color, thickness)
    cv2.circle(overlay, (x1+radius, y1+radius), radius, color, thickness)
    cv2.circle(overlay, (x2-radius, y1+radius), radius, color, thickness)
    cv2.circle(overlay, (x1+radius, y2-radius), radius, color, thickness)
    cv2.circle(overlay, (x2-radius, y2-radius), radius, color, thickness)
    if alpha < 1.0:
        cv2.addWeighted(overlay, alpha, img, 1-alpha, 0, img)
    else:
        img[:] = overlay[:]

def put_text_shadow(img, text, org, font, scale, color, thickness=1):
    sx, sy = org[0]+1, org[1]+1
    cv2.putText(img, text, (sx, sy), font, scale, (0,0,0), thickness+1, cv2.LINE_AA)
    cv2.putText(img, text, org,      font, scale, color,   thickness,   cv2.LINE_AA)


def draw_card(img, x, y, w, h, label, value, unit, color, icon_char):
    rounded_rect(img, (x, y), (x+w, y+h), CLR_PANEL, radius=10, alpha=0.88)
    cv2.rectangle(img, (x, y+8), (x+4, y+h-8), color, -1)
    cx, cy = x+28, y+h//2
    cv2.circle(img, (cx, cy), 14, color, -1)
    put_text_shadow(img, icon_char, (cx-8, cy+6), FONT_MONO, 0.5, CLR_BG, 1)
    put_text_shadow(img, str(value), (x+50, y+h//2+12), FONT, 1.2, color, 2)
    put_text_shadow(img, label.upper(), (x+50, y+22), FONT_MONO, 0.38, CLR_GRAY, 1)
    tw = cv2.getTextSize(str(value), FONT, 1.2, 2)[0][0]
    put_text_shadow(img, unit, (x+52+tw, y+h//2+10), FONT_MONO, 0.36, CLR_GRAY, 1)

def draw_single_banner(img, status, w):
    if status == "HELMET":
        color, text = CLR_GREEN,  "SAFE: HELMET DETECTED"
    elif status == "NO HELMET":
        color, text = CLR_RED,    "WARNING: NO HELMET"
    else:
        color, text = CLR_YELLOW, "NO PERSON DETECTED"

    bh = 54
    h  = img.shape[0]
    overlay = img.copy()
    cv2.rectangle(overlay, (0, h-bh), (w, h), color, -1)
    cv2.addWeighted(overlay, 0.75, img, 0.25, 0, img)
    
    cv2.circle(img, (36, h-bh//2), 16, CLR_BG,  -1)
    cv2.circle(img, (36, h-bh//2), 12, color,   -1)
    put_text_shadow(img, text, (62, h-bh//2+7), FONT, 0.72, CLR_WHITE, 2)

def draw_multi_panel(img, safe_count, danger_count, total, frame_w, frame_h):
    hbar_h = 42
    overlay = img.copy()
    cv2.rectangle(overlay, (0, 0), (frame_w, hbar_h), CLR_BG, -1)
    cv2.addWeighted(overlay, 0.80, img, 0.20, 0, img)

    put_text_shadow(img, "HELMET SAFETY MONITOR", (12, 28), FONT, 0.58, CLR_ACCENT, 1)
    # Timestamp
    ts = datetime.now().strftime("%H:%M:%S  %d/%m/%Y")
    tw = cv2.getTextSize(ts, FONT_MONO, 0.40, 1)[0][0]
    put_text_shadow(img, ts, (frame_w - tw - 12, 26), FONT_MONO, 0.40, CLR_GRAY, 1)
    # Divider line
    cv2.line(img, (0, hbar_h), (frame_w, hbar_h), CLR_ACCENT, 1)

    panel_h = 110
    py = frame_h - panel_h
    overlay2 = img.copy()
    cv2.rectangle(overlay2, (0, py), (frame_w, frame_h), CLR_BG, -1)
    cv2.addWeighted(overlay2, 0.85, img, 0.15, 0, img)
    cv2.line(img, (0, py), (frame_w, py), CLR_ACCENT, 1)

    margin  = 12
    card_h  = 82
    card_w  = (frame_w - margin*4) // 3
    cy_top  = py + (panel_h - card_h) // 2

    # Card: Total persons
    draw_card(img, margin, cy_top, card_w, card_h,
              "Total Persons", total, "ppl", CLR_ACCENT, "P")

    # Card: Safe (helmet)
    draw_card(img, margin*2 + card_w, cy_top, card_w, card_h,
              "With Helmet", safe_count, "safe", CLR_GREEN, "H")

    # Card: No helmet
    draw_card(img, margin*3 + card_w*2, cy_top, card_w, card_h,
              "No Helmet", danger_count, "warning", CLR_RED, "!")

def draw_person_box(img, x1, y1, x2, y2, label, idx):
    is_safe  = (label == "safetyhelmet")
    color    = CLR_GREEN if is_safe else CLR_RED
    badge_txt = f"#{idx}  {'SAFE' if is_safe else 'WARN'}"
    icon      = "✓" if is_safe else "✗"

    ln = 18  # corner line length
    th = 2
    corners = [
        ((x1,y1),(x1+ln,y1),(x1,y1+ln)),
        ((x2,y1),(x2-ln,y1),(x2,y1+ln)),
        ((x1,y2),(x1+ln,y2),(x1,y2-ln)),
        ((x2,y2),(x2-ln,y2),(x2,y2-ln)),
    ]
    for apex, h_end, v_end in corners:
        cv2.line(img, apex, h_end, color, th, cv2.LINE_AA)
        cv2.line(img, apex, v_end, color, th, cv2.LINE_AA)

    bw, bh = 110, 22
    bx, by = x1, max(0, y1-bh-2)
    rounded_rect(img, (bx, by), (bx+bw, by+bh), color, radius=5, alpha=0.85)
    put_text_shadow(img, badge_txt, (bx+6, by+bh-5), FONT_MONO, 0.42, CLR_WHITE, 1)

def main():
    model = YOLO(MODEL_PATH)
    cap   = cv2.VideoCapture(CAM_INDEX)

    if not cap.isOpened():
        print("[ERROR] Kamera tidak dapat dibuka.")
        return

    # FPS counter
    fps_buf  = []
    prev_t   = cv2.getTickCount()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_h, frame_w = frame.shape[:2]

        results = model(frame, conf=CONF_THRESH, verbose=False)

        safe_count   = 0
        danger_count = 0
        detections   = []   # list of (x1,y1,x2,y2,label)

        for r in results:
            for box in r.boxes:
                cls   = int(box.cls[0])
                label = model.names[cls]
                x1,y1,x2,y2 = map(int, box.xyxy[0])
                if label in ("safetyhelmet", "nohelmet"):
                    detections.append((x1, y1, x2, y2, label))
                    if label == "safetyhelmet":
                        safe_count   += 1
                    else:
                        danger_count += 1

        total = safe_count + danger_count

        canvas = frame.copy()

        for idx, (x1, y1, x2, y2, label) in enumerate(detections, 1):
            draw_person_box(canvas, x1, y1, x2, y2, label, idx)

        if total == 0:
            draw_single_banner(canvas, "UNKNOWN", frame_w)

        elif total == 1:
            status = "HELMET" if safe_count == 1 else "NO HELMET"
            draw_single_banner(canvas, status, frame_w)

        else:
            draw_multi_panel(canvas, safe_count, danger_count, total, frame_w, frame_h)

        cur_t   = cv2.getTickCount()
        elapsed = (cur_t - prev_t) / cv2.getTickFrequency()
        prev_t  = cur_t
        fps_buf.append(1.0 / elapsed if elapsed > 0 else 0)
        if len(fps_buf) > 20:
            fps_buf.pop(0)
        fps = sum(fps_buf) / len(fps_buf)
        put_text_shadow(canvas, f"FPS {fps:.1f}",
                        (frame_w - 90, 30 if total > 1 else frame_h - 10),
                        FONT_MONO, 0.42, CLR_GRAY, 1)

        cv2.imshow("Helmet Safety Monitor", canvas)

        key = cv2.waitKey(1) & 0xFF
        if key == 27:   # ESC
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()