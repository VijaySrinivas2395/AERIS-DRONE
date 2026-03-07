import os
import cv2
import tempfile
import base64
import torch
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO

from resnet_model import ResNetUNet

app = Flask(__name__)
CORS(app)

# Load YOLOv8 nano model once at startup
model = YOLO("yolov8n.pt")

# COCO class index for "person" is 0
PERSON_CLASS_ID = 0
CONFIDENCE_THRESHOLD = 0.35
FRAME_SAMPLE_RATE = 3  # process every 3rd frame for speed

# Load ResNet Flood Severity model once at startup
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
flood_model = ResNetUNet().to(device)
try:
    flood_model.load_state_dict(torch.load("../Resnet model/resnetModel/models/flood_resnet_unet.pth", map_location=device))
    flood_model.eval()
    print("Flood ResNet model loaded successfully.")
except Exception as e:
    print(f"Warning: Could not load flood resnet weights: {e}")

@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "AI Drone YOLO & ResNet backend running"})


@app.route("/detect-video", methods=["POST"])
def detect_video():
    if "video" not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    video_file = request.files["video"]
    if video_file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    suffix = os.path.splitext(video_file.filename)[-1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        video_file.save(tmp_path)

    detections = []
    total_frames = 0
    frames_processed = 0

    try:
        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            return jsonify({"error": "Could not open video file"}), 400

        # Get video metadata
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        frame_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            total_frames += 1

            # Process every Nth frame
            if frame_idx % FRAME_SAMPLE_RATE == 0:
                frames_processed += 1
                results = model.track(frame, classes=[PERSON_CLASS_ID], persist=True, tracker="bytetrack.yaml", verbose=False)

                for result in results:
                    for box in result.boxes:
                        class_id = int(box.cls[0])
                        confidence = float(box.conf[0])
                        track_id = int(box.id[0]) if box.id is not None else -1

                        if class_id == PERSON_CLASS_ID and confidence >= CONFIDENCE_THRESHOLD:
                            x1, y1, x2, y2 = box.xyxy[0].tolist()
                            detections.append({
                                "frame": frame_idx,
                                "label": "person",
                                "confidence": round(confidence, 4),
                                "track_id": track_id,
                                "bbox": [
                                    round(x1), round(y1),
                                    round(x2), round(y2)
                                ],
                                "video_width": width,
                                "video_height": height,
                            })

            frame_idx += 1

        cap.release()

    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

    # Build frame-indexed lookup for frontend (frame -> list of detections)
    frame_map = {}
    for d in detections:
        frame_map.setdefault(str(d["frame"]), []).append(d)

    # Calculate distinct person count by aggregating unique tracking IDs
    # Ignore standalone flashes where track_id is -1 if we have other tracked individuals
    unique_ids = set([d["track_id"] for d in detections if d["track_id"] != -1])
    # Fallback to pure length if no tracks were established but detections exist
    if len(unique_ids) == 0 and len(detections) > 0:
        person_count = 1
    else:
        person_count = len(unique_ids)

    max_conf = round(max((d["confidence"] for d in detections), default=0.0), 4)

    return jsonify({
        "total_frames": total_frames,
        "frames_processed": frames_processed,
        "fps": round(fps, 2),
        "video_width": width,
        "video_height": height,
        "person_detected": person_count > 0,
        "person_count": person_count,
        "max_confidence": max_conf,
        "detections": detections,
        "frame_map": frame_map,
    })


@app.route("/detect-severity", methods=["POST"])
def detect_severity():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    image_file = request.files["image"]
    if image_file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    suffix = os.path.splitext(image_file.filename)[-1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        image_file.save(tmp_path)

    try:
        img = cv2.imread(tmp_path)
        if img is None:
            return jsonify({"error": "Invalid image format"}), 400

        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img_resized = cv2.resize(img, (256, 256))

        img_tensor = torch.tensor(img_resized).permute(2,0,1).unsqueeze(0).float() / 255.0
        img_tensor = img_tensor.to(device)

        with torch.no_grad():
            pred = flood_model(img_tensor)
            pred = torch.sigmoid(pred)
            mask = pred.squeeze().cpu().numpy()

        mask_binary = (mask <= 0.5).astype(np.uint8)

        flood_pixels = int(np.sum(mask_binary))
        total_pixels = int(mask_binary.size)
        flood_percentage = (flood_pixels / total_pixels) * 100

        # Percentage-based severity
        if flood_percentage < 25:
            severity = "NO FLOOD"
        elif flood_percentage < 40:
            severity = "NO FLOOD"
        elif flood_percentage < 60:
            severity = "FLOOD"
        else:
            severity = "HIGH FLOOD"

        # Convert raw binary mask to visual format
        # Scale 0/1 to 0/255 so it's visible as Black/White
        visual_mask = (mask_binary * 255).astype(np.uint8)
        
        # ResNet-UNet predicts a 128x128 mask for a 256x256 input. Resize to match.
        visual_mask_resized = cv2.resize(visual_mask, (256, 256), interpolation=cv2.INTER_NEAREST)
        
        # Colorize logical mask: e.g. blue tint for water (BGR layout)
        color_mask = np.zeros((256, 256, 3), dtype=np.uint8)
        color_mask[visual_mask_resized == 255] = [255, 100, 100]  # Light blue overlay

        # Combine original image with color mask (Overlay)
        overlay = cv2.addWeighted(img_resized, 0.7, color_mask, 0.3, 0)
        overlay_rgb = cv2.cvtColor(overlay, cv2.COLOR_BGR2RGB) # Switch back to BGR for encoding
        
        # Encode combined visual as Base64 JPEG to send to frontend
        _, buffer = cv2.imencode('.jpg', overlay_rgb)
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        return jsonify({
            "flood_pixels": flood_pixels,
            "total_pixels": total_pixels,
            "flood_percentage": round(flood_percentage, 2),
            "severity": severity,
            "mask_image_base64": f"data:image/jpeg;base64,{img_base64}"
        })

    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


if __name__ == "__main__":
    print("=" * 55)
    print("  AI Drone Flood Rescue — YOLO Detection Backend")
    print("  Confidence threshold : {:.0f}%".format(CONFIDENCE_THRESHOLD * 100))
    print("  Frame sample rate    : every {}th frame".format(FRAME_SAMPLE_RATE))
    print("  Running on           : http://localhost:5000")
    print("=" * 55)
    app.run(host="0.0.0.0", port=5000, debug=False)
