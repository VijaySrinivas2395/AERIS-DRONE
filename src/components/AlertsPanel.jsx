import { useState, useEffect } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiZap } from 'react-icons/fi';
import { MdFlightTakeoff } from 'react-icons/md';

const initialAlerts = [
  {
    id: 1,
    type: 'critical',
    icon: FiAlertTriangle,
    message: 'Victim detected in flood zone',
    detail: 'Sector G7 | Confidence: 94.7%',
    time: '14:32:07',
    color: '#ff4444',
  },
  {
    id: 2,
    type: 'info',
    icon: MdFlightTakeoff,
    message: 'RESC-01 dispatched to victim',
    detail: 'ETA: 1m 12s | Route calculated',
    time: '14:32:15',
    color: '#00ff88',
  },
  {
    id: 3,
    type: 'warning',
    icon: FiAlertTriangle,
    message: 'HIGH flood severity confirmed',
    detail: 'Water level 4.2m | Rising +12cm/h',
    time: '14:31:50',
    color: '#ffcc00',
  },
  {
    id: 4,
    type: 'info',
    icon: FiInfo,
    message: 'Surveillance drone SURV-01 online',
    detail: 'Battery 78% | Signal strong',
    time: '14:30:02',
    color: '#00d4ff',
  },
  {
    id: 5,
    type: 'success',
    icon: FiCheckCircle,
    message: 'AI model inference active',
    detail: 'YOLOv8 | 30 FPS | GPU accelerated',
    time: '14:29:45',
    color: '#9966ff',
  },
];

const newAlertTemplates = [
  { type: 'info', icon: FiZap, message: 'RESC-02 repositioning', detail: 'Moving to sector H3', color: '#00d4ff' },
  { type: 'warning', icon: FiAlertTriangle, message: 'Wind speed increasing', detail: '45 km/h — monitor closely', color: '#ffcc00' },
  { type: 'success', icon: FiCheckCircle, message: 'Signal relay boosted', detail: 'Coverage extended to 8 km radius', color: '#00ff88' },
  { type: 'critical', icon: FiAlertTriangle, message: 'Second victim sighted', detail: 'Sector F5 | Confidence: 88.2%', color: '#ff4444' },
];

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [nextId, setNextId] = useState(6);
  const [templateIdx, setTemplateIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const template = newAlertTemplates[templateIdx % newAlertTemplates.length];
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      setAlerts((prev) => [
        {
          id: nextId,
          ...template,
          time: timeStr,
        },
        ...prev.slice(0, 9),
      ]);
      setNextId((n) => n + 1);
      setTemplateIdx((i) => i + 1);
    }, 6000);
    return () => clearInterval(interval);
  }, [nextId, templateIdx]);

  return (
    <div className="flex flex-col h-full bg-drone-panel border border-drone-border rounded-lg overflow-hidden panel-glow">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-drone-border bg-black/30 shrink-0">
        <div className="flex items-center gap-2">
          <FiAlertTriangle size={14} color="#ffcc00" />
          <span className="text-xs font-mono text-drone-accent tracking-widest">SYSTEM ALERTS</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-mono text-drone-text/50">{alerts.length} EVENTS</div>
          <div className="w-2 h-2 rounded-full bg-drone-red status-pulse-red" />
        </div>
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-auto p-2 space-y-1.5">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="alert-item flex items-start gap-2.5 rounded-lg p-2.5 border"
            style={{
              background: alert.color + '10',
              borderColor: alert.color + '30',
            }}
          >
            <div className="shrink-0 mt-0.5">
              <alert.icon size={14} color={alert.color} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-semibold truncate" style={{ color: alert.color }}>
                  {alert.message}
                </span>
                <span className="text-xs font-mono text-drone-text/40 shrink-0">{alert.time}</span>
              </div>
              <div className="text-xs font-mono text-drone-text/50 mt-0.5 truncate">{alert.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-drone-border bg-black/30 shrink-0">
        <div className="flex justify-between text-xs font-mono text-drone-text/40">
          <span>AUTO-REFRESH: 6s</span>
          <span className="text-drone-accent animate-blink">● MONITORING</span>
        </div>
      </div>
    </div>
  );
}
