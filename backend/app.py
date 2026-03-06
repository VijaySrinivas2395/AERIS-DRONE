import os
import cv2
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

# Load YOLOv8 nano model once at startup
model = YOLO("yolov8n.pt")

# COCO class index for "person" is 0
PERSON_CLASS_ID = 0
CONFIDENCE_THRESHOLD = 0.35
FRAME_SAMPLE_RATE = 3  # process every 3rd frame for speed


@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "AI Drone YOLO backend running"})


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
                results = model(frame, classes=[PERSON_CLASS_ID], verbose=False)

                for result in results:
                    for box in result.boxes:
                        class_id = int(box.cls[0])
                        confidence = float(box.conf[0])

                        if class_id == PERSON_CLASS_ID and confidence >= CONFIDENCE_THRESHOLD:
                            x1, y1, x2, y2 = box.xyxy[0].tolist()
                            detections.append({
                                "frame": frame_idx,
                                "label": "person",
                                "confidence": round(confidence, 4),
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

    # Calculate actual person count (max in any single frame)
    person_count = max((len(dets) for dets in frame_map.values()), default=0)
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


if __name__ == "__main__":
    print("=" * 55)
    print("  AI Drone Flood Rescue — YOLO Detection Backend")
    print("  Confidence threshold : {:.0f}%".format(CONFIDENCE_THRESHOLD * 100))
    print("  Frame sample rate    : every {}th frame".format(FRAME_SAMPLE_RATE))
    print("  Running on           : http://localhost:5000")
    print("=" * 55)
    app.run(host="0.0.0.0", port=5000, debug=False)
