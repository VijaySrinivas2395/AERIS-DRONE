import { useState, useEffect } from 'react';
import { FiDroplet, FiTrendingUp, FiAlertTriangle } from 'react-icons/fi';

const severityData = {
  LOW: {
    label: 'LOW',
    color: '#00ff88',
    bgColor: 'rgba(0,255,136,0.1)',
    borderColor: 'rgba(0,255,136,0.4)',
    fill: 28,
    description: 'Manageable flood conditions. Monitoring active.',
  },
  MEDIUM: {
    label: 'MEDIUM',
    color: '#ffcc00',
    bgColor: 'rgba(255,204,0,0.1)',
    borderColor: 'rgba(255,204,0,0.4)',
    fill: 62,
    description: 'Elevated risk. Rescue teams on standby.',
  },
  HIGH: {
    label: 'HIGH',
    color: '#ff4444',
    bgColor: 'rgba(255,68,68,0.1)',
    borderColor: 'rgba(255,68,68,0.4)',
    fill: 91,
    description: 'Critical flood level! Immediate rescue required.',
  },
};

const waterLevel = 'HIGH';
const confidence = 91.4;

const metrics = [
  { label: 'Water Level', value: '4.2m', icon: FiDroplet, color: '#00d4ff' },
  { label: 'Rise Rate', value: '+12cm/h', icon: FiTrendingUp, color: '#ff4444' },
  { label: 'Coverage', value: '87%', icon: FiAlertTriangle, color: '#ffcc00' },
];

export default function WaterSeverity() {
  const [animated, setAnimated] = useState(false);
  const data = severityData[waterLevel];

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  const segments = ['LOW', 'MEDIUM', 'HIGH'];

  return (
    <div className="flex flex-col h-full bg-drone-panel border border-drone-border rounded-lg overflow-hidden panel-glow">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-drone-border bg-black/30 shrink-0">
        <div className="flex items-center gap-2">
          <FiDroplet size={14} color={data.color} />
          <span className="text-xs font-mono text-drone-accent tracking-widest">WATER SEVERITY</span>
        </div>
        <div className="text-xs font-mono text-drone-text/50">AI ANALYSIS</div>
      </div>

      <div className="flex-1 flex flex-col justify-between p-3 gap-3 overflow-auto">
        {/* Severity badge */}
        <div
          className="flex items-center justify-between rounded-lg px-4 py-3 border"
          style={{ background: data.bgColor, borderColor: data.borderColor }}
        >
          <div>
            <div className="text-xs font-mono text-drone-text/60 mb-1">SEVERITY LEVEL</div>
            <div className="text-2xl font-bold font-mono tracking-widest" style={{ color: data.color }}>
              {data.label}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono text-drone-text/60 mb-1">CONFIDENCE</div>
            <div className="text-2xl font-bold font-mono" style={{ color: data.color }}>
              {confidence}%
            </div>
          </div>
        </div>

        {/* Severity bar */}
        <div>
          <div className="flex justify-between text-xs font-mono text-drone-text/50 mb-2">
            <span>FLOOD INTENSITY</span>
            <span>{data.fill}%</span>
          </div>
          {/* Segmented bar */}
          <div className="flex gap-1 h-4 rounded-sm overflow-hidden">
            {segments.map((seg) => {
              const s = severityData[seg];
              const isActive = segments.indexOf(seg) <= segments.indexOf(waterLevel);
              const isCurrent = seg === waterLevel;
              return (
                <div
                  key={seg}
                  className="flex-1 flex items-center justify-center text-xs font-mono transition-all duration-1000 rounded-sm"
                  style={{
                    background: isActive ? (isCurrent ? s.color : s.color + '60') : 'rgba(255,255,255,0.05)',
                    color: isActive ? (isCurrent ? '#000' : '#fff') : '#444',
                    boxShadow: (isCurrent && animated) ? `0 0 10px ${s.color}` : 'none',
                    fontWeight: isCurrent ? 700 : 400,
                    fontSize: '9px',
                    letterSpacing: '0.05em',
                  }}
                >
                  {seg}
                </div>
              );
            })}
          </div>
        </div>

        {/* Fill bar */}
        <div>
          <div className="h-2 bg-drone-bg rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 severity-bar"
              style={{
                width: animated ? `${data.fill}%` : '0%',
                background: `linear-gradient(90deg, ${data.color}99, ${data.color})`,
                boxShadow: `0 0 12px ${data.color}88`,
              }}
            />
          </div>
        </div>

        {/* Description */}
        <div className="text-xs font-mono text-drone-text/60 italic">{data.description}</div>

        {/* Metrics grid */}
        <div className="grid grid-cols-3 gap-2">
          {metrics.map((m) => (
            <div key={m.label} className="bg-drone-bg border border-drone-border rounded p-2 text-center">
              <m.icon size={14} color={m.color} className="mx-auto mb-1" />
              <div className="text-sm font-bold font-mono" style={{ color: m.color }}>{m.value}</div>
              <div className="text-xs text-drone-text/50 font-mono">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
