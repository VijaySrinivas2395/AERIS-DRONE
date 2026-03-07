import { useState, useRef } from 'react';
import { FiUpload, FiImage, FiActivity, FiAlertTriangle } from 'react-icons/fi';

export default function ResnetScanner() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      setSelectedFile(file);
      setSelectedImage(URL.createObjectURL(file));
      setResults(null);
      setError(null);
      scanImage(file);
    }
  };

  const scanImage = async (file) => {
    setIsScanning(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await fetch('http://localhost:5000/detect-severity', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setResults(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to analyze image');
    } finally {
      setIsScanning(false);
    }
  };

  // UI Helper for severity color
  const getSeverityColor = (sev) => {
    if (sev === 'HIGH FLOOD') return '#ff4444';
    if (sev === 'FLOOD') return '#ffcc00';
    return '#00ff88';
  };

  return (
    <div className="h-full flex flex-col bg-drone-panel/50 rounded-lg border border-drone-border p-3 overflow-y-auto custom-scrollbar">
      
      {/* Upload Area / Image Preview */}
      <div className="relative w-full h-32 shrink-0 rounded border border-dashed border-drone-border overflow-hidden bg-black/30 group cursor-pointer hover:border-drone-accent/50 transition-all mb-3"
           onClick={() => fileInputRef.current?.click()}
      >
        {selectedImage ? (
          <>
            <img src={selectedImage} alt="Uploaded scene" className="w-full h-full object-contain bg-black/40 opacity-80" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity opacity-0 group-hover:opacity-100">
              <span className="font-mono text-xs text-drone-accent flex items-center gap-2">
                <FiUpload /> REPLACE IMAGE
              </span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <FiUpload className="text-drone-text/40 mb-2" size={24} />
            <span className="font-mono text-xs text-drone-text/50">UPLOAD AERIAL IMAGE</span>
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          accept="image/*" 
          className="hidden" 
        />
      </div>

      {/* Status & Results Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        {isScanning && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-drone-accent">
            <FiActivity className="animate-spin" size={24} />
            <span className="font-mono text-xs animate-pulse">ANALYZING RESNET...</span>
          </div>
        )}

        {error && (
          <div className="p-2 bg-drone-red/10 border border-drone-red/20 rounded text-drone-red flex items-start gap-2">
             <FiAlertTriangle className="shrink-0 mt-0.5" />
             <span className="text-xs font-mono">{error}</span>
          </div>
        )}

        {results && !isScanning && (
          <div className="space-y-3">
            {/* Severity Header */}
            <div className="flex items-center justify-between p-2 rounded border border-drone-border bg-black/20">
              <span className="font-mono text-[11px] text-drone-text/60">SEVERITY SCAN:</span>
              <span className="font-mono font-bold animate-pulse text-sm" style={{ color: getSeverityColor(results.severity) }}>
                {results.severity}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 border border-drone-border/50 rounded bg-drone-bg/30">
                <div className="text-[10px] font-mono text-drone-text/40 mb-1">FLOOD COVERAGE</div>
                <div className="font-mono text-sm font-bold" style={{ color: getSeverityColor(results.severity) }}>
                  {results.flood_percentage}%
                </div>
              </div>
              <div className="p-2 border border-drone-border/50 rounded bg-drone-bg/30">
                <div className="text-[10px] font-mono text-drone-text/40 mb-1">WATER PIXELS</div>
                <div className="font-mono text-xs text-drone-text/80 mt-1">
                  {results.flood_pixels.toLocaleString()} 
                </div>
              </div>
            </div>

            {/* Visual Mask Render */}
            {results.mask_image_base64 && (
              <div className="mt-3 rounded-lg border border-drone-border overflow-hidden relative group bg-black/40">
                <img 
                  src={results.mask_image_base64} 
                  alt="UNet Mask" 
                  className="w-full h-40 object-contain p-1"
                />
                <div className="absolute top-0 left-0 right-0 bg-drone-panel/90 text-drone-text/80 p-1 border-b border-drone-border/50">
                  <span className="text-[10px] uppercase tracking-widest font-mono flex items-center gap-1.5 px-1">
                    <FiImage className="text-drone-accent" /> AI Flood Prediction Mask
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
