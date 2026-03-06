import { useState, useRef, useEffect, useCallback } from 'react';
import {
  FiUploadCloud, FiPlay, FiPause, FiAlertTriangle,
  FiCheckCircle, FiEye, FiActivity, FiVideo, FiX, FiZap
} from 'react-icons/fi';
import { MdOutlineRadar } from 'react-icons/md';

const BACKEND_URL = 'http://localhost:5000/detect-video';
const ASSUMED_FPS = 30;

// Draw all bounding boxes for the current video frame onto the canvas
function drawDetections(canvas, video, frameDetections) {
  if (!canvas || !video) return;

  const ctx = canvas.getContext('2d');
  const dw = video.videoWidth  || video.clientWidth;
  const dh = video.videoHeight || video.clientHeight;
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;

  // Keep canvas pixel size in sync with display size
  if (canvas.width !== cw)  canvas.width  = cw;
  if (canvas.height !== ch) canvas.height = ch;

  ctx.clearRect(0, 0, cw, ch);

  if (!frameDetections || frameDetections.length === 0) return;

  // Scale factor: video native → canvas display size
  const scaleX = cw / (dw || cw);
  const scaleY = ch / (dh || ch);

  frameDetections.forEach((det) => {
    const [x1, y1, x2, y2] = det.bbox;
    const sx = x1 * scaleX;
    const sy = y1 * scaleY;
    const sw = (x2 - x1) * scaleX;
    const sh = (y2 - y1) * scaleY;

    // Box
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 10;
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.shadowBlur = 0;

    // Corner accents (TL, TR, BL, BR)
    const cs = 14;
    ctx.strokeStyle = '#ff6666';
    ctx.lineWidth = 3;
    [[sx, sy, cs, 0, 0, cs], [sx + sw, sy, -cs, 0, 0, cs],
     [sx, sy + sh, cs, 0, 0, -cs], [sx + sw, sy + sh, -cs, 0, 0, -cs]]
      .forEach(([ox, oy, dx1, dy1, dx2, dy2]) => {
        ctx.beginPath(); ctx.moveTo(ox + dx1, oy); ctx.lineTo(ox, oy); ctx.lineTo(ox, oy + dy2); ctx.stroke();
      });

    // Label background
    const label = `PERSON  ${(det.confidence * 100).toFixed(1)}%`;
    ctx.font = 'bold 11px monospace';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(255,68,68,0.85)';
    ctx.fillRect(sx, sy - 20, tw + 10, 18);

    // Label text
    ctx.fillStyle = '#fff';
    ctx.fillText(label, sx + 5, sy - 6);
  });
}

export default function DroneVideo({ onAnalysisComplete }) {
  const [videoSrc, setVideoSrc]   = useState(null);
  const [videoName, setVideoName] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

  // Backend state
  const [uploading, setUploading] = useState(false);
  const [apiError, setApiError]   = useState(null);
  const [result, setResult]       = useState(null);

  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const rafRef      = useRef(null);
  const fileInputRef = useRef(null);

  // ── Canvas animation loop ────────────────────────────────────────
  const frameMap = result?.frame_map ?? {};
  const fps      = result?.fps ?? ASSUMED_FPS;

  const renderLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const currentVideoFrame = Math.floor(video.currentTime * fps);
    setCurrentFrame(currentVideoFrame);

    // Look up all nearby sampled frames (within ±FRAME_SAMPLE_RATE/2)
    const SAMPLE = 5;
    let frameDetections = [];
    for (let offset = 0; offset <= SAMPLE; offset++) {
      const key = String(currentVideoFrame - (currentVideoFrame % SAMPLE));
      if (frameMap[key]) { frameDetections = frameMap[key]; break; }
      if (frameMap[String(currentVideoFrame - offset)]) { frameDetections = frameMap[String(currentVideoFrame - offset)]; break; }
    }
    drawDetections(canvas, video, frameDetections);

    rafRef.current = requestAnimationFrame(renderLoop);
  }, [frameMap, fps]);

  // Start/stop render loop based on videoSrc
  useEffect(() => {
    if (videoSrc && result) {
      rafRef.current = requestAnimationFrame(renderLoop);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [videoSrc, result, renderLoop]);

  // ── Send video to Flask backend ──────────────────────────────────
  const sendToBackend = async (file) => {
    setUploading(true);
    setApiError(null);
    setResult(null);
    if (onAnalysisComplete) onAnalysisComplete(0);

    try {
      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch(BACKEND_URL, { method: 'POST', body: formData });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      if (onAnalysisComplete) onAnalysisComplete(data.person_count);
    } catch (err) {
      setApiError(err.message || 'Backend connection failed');
    } finally {
      setUploading(false);
    }
  };

  // ── Handle file selection ────────────────────────────────────────
  const handleFile = (file) => {
    if (!file) return;
    if (!['video/mp4', 'video/quicktime', 'video/webm'].includes(file.type)) {
      alert('Please upload a valid video file (.mp4  .mov  .webm)'); return;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoName(file.name);
    setIsPlaying(false);
    setCurrentFrame(0);
    sendToBackend(file);
  };

  const handleInputChange = (e) => handleFile(e.target.files[0]);
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); }
    else { v.pause(); setIsPlaying(false); }
  };

  // Derived
  const personDets = result?.detections?.filter(d => d.label === 'person') ?? [];
  const maxConf    = result?.max_confidence ?? 0;
  const isDetectionActive = result?.person_detected && !uploading;

  // Current frame detections for status display
  const SAMPLE = 5;
  const nearestKey = String(currentFrame - (currentFrame % SAMPLE));
  const currentDets = frameMap[nearestKey] ?? [];

  return (
    <div className="flex flex-col h-full bg-drone-panel border border-drone-border rounded-lg overflow-hidden panel-glow">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/40 border-b border-drone-border shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${videoSrc ? 'bg-drone-red status-pulse-red' : 'bg-drone-text/30'}`} />
          <span className="text-xs font-mono text-drone-accent tracking-widest">
            {uploading ? 'ANALYZING DRONE FOOTAGE' : videoSrc ? 'DRONE FOOTAGE LOADED' : 'DRONE VIDEO FEED'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isDetectionActive && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold animate-pulse"
              style={{ background: 'rgba(255,68,68,0.15)', border: '1px solid #ff444460', color: '#ff4444' }}
            >
              <FiZap size={10} /> DETECTION ACTIVE
            </div>
          )}
          {videoSrc && (
            <span className="text-xs font-mono text-drone-text/50 truncate max-w-[120px] flex items-center gap-1">
              <FiVideo size={11} />{videoName}
            </span>
          )}
        </div>
      </div>

      {/* ── Video + Canvas overlay ────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden bg-black">
        {videoSrc ? (
          <>
            {/* Video element */}
            <video
              ref={videoRef}
              src={videoSrc}
              className="w-full h-full object-contain"
              onEnded={() => setIsPlaying(false)}
            />

            {/* Bounding box canvas — perfectly overlaid */}
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ zIndex: 5 }}
            />

            {/* CRT overlay */}
            <div className="crt-overlay" style={{ zIndex: 6 }} />

            {/* Corner HUD brackets */}
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 7 }}>
              <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-drone-accent opacity-70" />
              <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-drone-accent opacity-70" />
              <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-drone-accent opacity-70" />
              <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-drone-accent opacity-70" />
            </div>

            {/* YOLOv8 badge */}
            <div className="absolute top-2 left-2 z-10 bg-black/60 border border-drone-accent/40 rounded px-2 py-0.5" style={{ zIndex: 10 }}>
              <span className="text-xs font-mono text-drone-accent">YOLOv8n</span>
            </div>

            {/* Current frame detections count */}
            {isDetectionActive && (
              <div className="absolute top-2 right-2 font-mono text-xs bg-black/60 px-2 py-0.5 rounded border border-drone-red/40" style={{ zIndex: 10, color: '#ff4444' }}>
                {currentDets.length > 0 ? `${currentDets.length} PERSON` : ''}
              </div>
            )}

            {/* Frame counter */}
            <div className="absolute bottom-8 left-2 font-mono text-xs text-drone-text/40" style={{ zIndex: 10 }}>
              FRAME: {String(currentFrame).padStart(6, '0')}
            </div>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 border border-drone-border hover:border-drone-accent/60 transition-all"
              style={{ zIndex: 10 }}
            >
              {isPlaying ? <FiPause size={16} color="#00d4ff" /> : <FiPlay size={16} color="#00d4ff" />}
            </button>

            {/* Uploading / processing overlay */}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/75" style={{ zIndex: 20 }}>
                <div className="flex flex-col items-center gap-3">
                  <MdOutlineRadar size={44} color="#00d4ff" className="radar-sweep" />
                  <div className="text-xs font-mono text-drone-accent text-center">
                    <div className="font-bold">ANALYZING DRONE FOOTAGE</div>
                    <div className="text-drone-text/40 mt-1">YOLOv8 processing frames via Flask…</div>
                    <div className="text-drone-text/30 mt-1">Confidence threshold: 75%</div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ── Drop zone ── */
          <div
            className={`flex flex-col items-center justify-center h-full gap-4 cursor-pointer transition-all duration-200
              ${dragOver ? 'bg-drone-accent/10 border-2 border-dashed border-drone-accent' : 'border-2 border-dashed border-drone-border/40'}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.3)' }}
            >
              <FiUploadCloud size={32} color="#00d4ff" />
            </div>
            <div className="text-center px-4">
              <div className="text-sm font-mono text-drone-accent mb-1">Upload Drone Footage</div>
              <div className="text-xs font-mono text-drone-text/50">Drag & drop or click to browse</div>
              <div className="text-xs font-mono text-drone-text/30 mt-1">.mp4 · .mov · .webm</div>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.4)', color: '#00d4ff' }}
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              <FiUploadCloud size={14} /> Select Video File
            </button>
            <div className="text-xs font-mono text-drone-text/30">Bounding boxes drawn per-frame · Conf ≥ 75%</div>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleInputChange} />
      </div>

      {/* ── Detection Results Panel ───────────────────────────────── */}
      <div className="px-3 py-2 border-t border-drone-border bg-black/40 shrink-0 space-y-2">

        {/* API Error */}
        {apiError && (
          <div className="flex items-start gap-2 p-2 rounded border border-drone-red/40 bg-drone-red/10">
            <FiX size={12} color="#ff4444" className="mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-mono text-drone-red font-semibold">BACKEND ERROR</div>
              <div className="text-xs font-mono text-drone-text/50">{apiError}</div>
              <div className="text-xs font-mono text-drone-text/30">Ensure Flask server is on port 5000</div>
            </div>
          </div>
        )}

        {/* Analyzing indicator */}
        {uploading && (
          <div className="flex items-center gap-2 text-xs font-mono text-drone-accent animate-pulse">
            <MdOutlineRadar size={13} className="radar-sweep" />
            <span>Sending to backend · YOLOv8 analyzing…</span>
          </div>
        )}

        {/* Results */}
        {result && !uploading && (
          <>
            {/* Summary row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {result.person_detected
                  ? <FiAlertTriangle size={12} color="#ff4444" />
                  : <FiCheckCircle size={12} color="#00ff88" />}
                <span className="text-xs font-mono font-semibold"
                  style={{ color: result.person_detected ? '#ff4444' : '#00ff88' }}>
                  {result.person_detected ? 'VICTIM DETECTED' : 'NO PERSON DETECTED'}
                </span>
              </div>
              <span className="text-xs font-mono text-drone-text/50">
                {result.person_count} detection{result.person_count !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Confidence indicator */}
            {result.person_detected && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Victims', value: result.person_count, color: '#ff4444' },
                    { label: 'Max Conf', value: `${(maxConf * 100).toFixed(1)}%`, color: '#ffcc00' },
                    { label: 'Frame', value: personDets[0]?.frame ?? '—', color: '#00d4ff' },
                  ].map((m) => (
                    <div key={m.label}
                      className="rounded p-2 text-center border"
                      style={{ background: m.color + '10', borderColor: m.color + '30' }}>
                      <div className="text-sm font-bold font-mono" style={{ color: m.color }}>{m.value}</div>
                      <div className="text-xs font-mono text-drone-text/50">{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Confidence bar */}
                <div className="h-1.5 bg-drone-bg rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${maxConf * 100}%`, background: '#ff4444', boxShadow: '0 0 8px #ff444488' }} />
                </div>

                {/* Detection list */}
                <div className="space-y-1 max-h-20 overflow-auto">
                  {personDets.slice(0, 5).map((d, i) => (
                    <div key={i}
                      className="flex items-center justify-between rounded px-2 py-0.5 text-xs font-mono border"
                      style={{ background: 'rgba(255,68,68,0.06)', borderColor: 'rgba(255,68,68,0.2)' }}>
                      <span className="text-drone-red">PERSON</span>
                      <span className="text-drone-text/40">Frame {d.frame}</span>
                      <span style={{ color: '#ff4444' }}>{(d.confidence * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Meta stats */}
            <div className="flex items-center gap-4 text-xs font-mono text-drone-text/40">
              <div className="flex items-center gap-1"><FiActivity size={10} /><span>{result.total_frames} frames</span></div>
              <div className="flex items-center gap-1"><FiEye size={10} /><span>{result.frames_processed} scanned</span></div>
              <div className="flex items-center gap-1"><span>@{result.fps} fps</span></div>
            </div>
          </>
        )}

        {/* Idle */}
        {!result && !uploading && !apiError && (
          <div className="flex items-center justify-between text-xs font-mono text-drone-text/40">
            <div className="flex items-center gap-1.5"><FiEye size={11} />
              <span>{videoSrc ? 'PROCESSING…' : 'AWAITING VIDEO UPLOAD'}</span>
            </div>
            <div className="flex items-center gap-1"><FiActivity size={11} /><span>YOLOv8n READY</span></div>
          </div>
        )}

        {/* Replace footage */}
        {videoSrc && !uploading && (
          <button
            className="w-full flex items-center justify-center gap-1.5 py-1 rounded text-xs font-mono text-drone-text/40 hover:text-drone-accent border border-drone-border/40 hover:border-drone-accent/40 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <FiUploadCloud size={11} /> Replace footage
          </button>
        )}
      </div>
    </div>
  );
}
