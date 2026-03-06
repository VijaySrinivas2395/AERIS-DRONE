import { useState, useEffect, useCallback } from 'react';
import MapView from '../components/MapView';
import DroneVideo from '../components/DroneVideo';
import WaterSeverity from '../components/WaterSeverity';
import DroneStatus from '../components/DroneStatus';
import AlertsPanel from '../components/AlertsPanel';
import { FiSettings, FiBell } from 'react-icons/fi';
import { MdOutlineRadar, MdFlightTakeoff } from 'react-icons/md';

export default function Dashboard() {
  const [selectedDrone, setSelectedDrone] = useState('rescue1');
  const [personDetected, setPersonDetected] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toISOString().slice(11, 19) + ' UTC');

  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTime(new Date().toISOString().slice(11, 19) + ' UTC');
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const handleDroneSelect = useCallback((droneKey) => {
    setSelectedDrone(droneKey);
  }, []);

  const handlePersonDetected = useCallback((detected) => {
    setPersonDetected(detected);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-drone-bg">

      {/* ─── HEADER ─── */}
      <header
        className="shrink-0 border-b border-drone-border bg-drone-panel/80 backdrop-blur-sm"
        style={{ boxShadow: '0 2px 30px rgba(0,212,255,0.08)' }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          {/* Branding */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #00d4ff22, #00d4ff44)',
                  border: '1px solid #00d4ff60',
                  boxShadow: '0 0 16px rgba(0,212,255,0.3)',
                }}
              >
                <MdFlightTakeoff size={20} color="#00d4ff" />
              </div>
              <div
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-drone-green"
                style={{ boxShadow: '0 0 6px #00ff88' }}
              />
            </div>
            <div>
              <div className="header-glow text-base font-bold text-drone-accent font-mono tracking-wider leading-tight">
                AI DRONE FLOOD RESCUE
              </div>
              <div className="text-xs text-drone-text/50 font-mono tracking-widest">CONTROL CENTER</div>
            </div>
          </div>

          {/* Status pills */}
          <div className="hidden md:flex items-center gap-3">
            {[
              { label: 'SYSTEM', value: 'NOMINAL', color: '#00ff88' },
              { label: 'DRONES', value: '3/4 ACTIVE', color: '#00d4ff' },
              { label: 'VICTIMS', value: personDetected ? `${personDetected === true ? 1 : personDetected} LOCATED` : 'SCANNING', color: personDetected ? '#ff4444' : '#ffcc00' },
              { label: 'SEVERITY', value: 'HIGH', color: '#ff4444' },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono"
                style={{ borderColor: s.color + '40', background: s.color + '10' }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 4px ${s.color}` }} />
                <span className="text-drone-text/50">{s.label}:</span>
                <span style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Clock + actions */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono text-drone-text/40">
              <MdOutlineRadar size={14} className="text-drone-accent radar-sweep" />
              <span>{currentTime}</span>
            </div>
            <button className="p-1.5 rounded-lg border border-drone-border hover:border-drone-accent/50 hover:bg-drone-accent/10 transition-all">
              <FiBell size={15} color="#c8d8f0" />
            </button>
            <button className="p-1.5 rounded-lg border border-drone-border hover:border-drone-accent/50 hover:bg-drone-accent/10 transition-all">
              <FiSettings size={15} color="#c8d8f0" />
            </button>
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono"
              style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-drone-green status-pulse-green" />
              <span className="text-drone-green">MISSION ACTIVE</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 p-3 flex flex-col gap-3 overflow-hidden">

        {/* TOP ROW: Video (left, wider) | Map (right) */}
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: '2fr 1fr',
            height: '68vh',
            minHeight: '320px',
          }}
        >
          {/* LEFT: Drone Video Panel */}
          <div className="flex flex-col min-w-0 min-h-0">
            <div className="text-xs font-mono text-drone-text/40 mb-1 px-1 flex items-center justify-between">
              <span className="uppercase tracking-widest">Drone Video Feed</span>
              {personDetected && (
                <span className="text-drone-red animate-pulse text-xs">⚠ Person Detected</span>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <DroneVideo onAnalysisComplete={(count) => setPersonDetected(count > 0 ? count : false)} />
            </div>
          </div>

          {/* RIGHT: Map Panel */}
          <div className="flex flex-col min-w-0 min-h-0">
            <div className="text-xs font-mono text-drone-text/40 mb-1 px-1 flex items-center justify-between">
              <span className="uppercase tracking-widest">Tactical Map</span>
              <span className="text-drone-text/30 text-xs">Route: {selectedDrone.toUpperCase()} → VICTIM</span>
            </div>
            <div className="flex-1 min-h-0">
              <MapView selectedDrone={selectedDrone} personCount={typeof personDetected === 'number' ? personDetected : (personDetected ? 1 : 0)} />
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: 3 equal panels */}
        <div
          className="grid grid-cols-3 gap-3"
          style={{ height: 'calc(32vh - 3rem - 56px)', minHeight: '220px' }}
        >
          <div className="flex flex-col min-w-0">
            <div className="text-xs font-mono text-drone-text/40 mb-1 px-1 uppercase tracking-widest">Water Severity</div>
            <div className="flex-1 min-h-0">
              <WaterSeverity />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="text-xs font-mono text-drone-text/40 mb-1 px-1 uppercase tracking-widest">Fleet Status</div>
            <div className="flex-1 min-h-0">
              <DroneStatus onSelectDrone={handleDroneSelect} />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="text-xs font-mono text-drone-text/40 mb-1 px-1 uppercase tracking-widest">System Alerts</div>
            <div className="flex-1 min-h-0">
              <AlertsPanel />
            </div>
          </div>
        </div>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="shrink-0 border-t border-drone-border px-4 py-1.5 flex items-center justify-between bg-drone-panel/60">
        <div className="text-xs font-mono text-drone-text/30">
          AI DRONE FLOOD RESCUE CONTROL CENTER · v2.5.0
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-drone-text/30">
          <span>LATENCY: 12ms</span>
          <span>UPTIME: 04:32:17</span>
          <span className="text-drone-green">● ALL SYSTEMS GO</span>
        </div>
      </footer>
    </div>
  );
}
