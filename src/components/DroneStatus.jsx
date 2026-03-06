import { useState } from 'react';
import { FiRadio, FiMapPin, FiBattery, FiWifi } from 'react-icons/fi';
import { MdFlightTakeoff } from 'react-icons/md';


const drones = [
  {
    id: 'RESC-01',
    status: 'Assigned',
    distance: '1.2 km',
    battery: 82,
    signal: 91,
    speed: '62 km/h',
    eta: '1m 12s',
    color: '#00ff88',
  },
  {
    id: 'RESC-02',
    status: 'Available',
    distance: '3.7 km',
    battery: 94,
    signal: 85,
    speed: '0 km/h',
    eta: '—',
    color: '#00d4ff',
  },
  {
    id: 'RESC-03',
    status: 'Standby',
    distance: '5.1 km',
    battery: 67,
    signal: 76,
    speed: '0 km/h',
    eta: '—',
    color: '#9966ff',
  },
  {
    id: 'RESC-04',
    status: 'Offline',
    distance: '—',
    battery: 12,
    signal: 0,
    speed: '—',
    eta: '—',
    color: '#ff4444',
  },
];

const statusConfig = {
  Assigned: { color: '#00ff88', bg: 'rgba(0,255,136,0.12)', pulse: 'status-pulse-green' },
  Available: { color: '#00d4ff', bg: 'rgba(0,212,255,0.12)', pulse: '' },
  Standby: { color: '#ffcc00', bg: 'rgba(255,204,0,0.1)', pulse: '' },
  Offline: { color: '#ff4444', bg: 'rgba(255,68,68,0.1)', pulse: 'status-pulse-red' },
};

export default function DroneStatus({ onSelectDrone }) {
  const [selected, setSelected] = useState('RESC-01');

  const handleSelect = (droneId) => {
    const key = droneId.replace('RESC-', 'rescue');
    setSelected(droneId);
    if (onSelectDrone) onSelectDrone(key.toLowerCase());
  };

  return (
    <div className="flex flex-col h-full bg-drone-panel border border-drone-border rounded-lg overflow-hidden panel-glow">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-drone-border bg-black/30 shrink-0">
        <div className="flex items-center gap-2">
          <MdFlightTakeoff size={14} color="#00d4ff" />
          <span className="text-xs font-mono text-drone-accent tracking-widest">RESCUE FLEET</span>
        </div>
        <div className="text-xs font-mono text-drone-green">{drones.filter(d => d.status !== 'Offline').length}/{drones.length} ACTIVE</div>
      </div>

      {/* Drone list */}
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {drones.map((drone) => {
          const sc = statusConfig[drone.status];
          const isSelected = selected === drone.id;
          return (
            <button
              key={drone.id}
              onClick={() => handleSelect(drone.id)}
              className="w-full text-left rounded-lg p-2.5 border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: isSelected ? sc.bg : 'rgba(255,255,255,0.02)',
                borderColor: isSelected ? drone.color + '80' : '#1e3a5f',
                boxShadow: isSelected ? `0 0 12px ${drone.color}22` : 'none',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${sc.pulse}`}
                    style={{ background: sc.color, boxShadow: `0 0 6px ${sc.color}` }}
                  />
                  <span className="font-mono font-bold text-sm" style={{ color: drone.color }}>
                    {drone.id}
                  </span>
                </div>
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded-full"
                  style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}40` }}
                >
                  {drone.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-mono text-drone-text/70">
                <div className="flex items-center gap-1">
                  <FiMapPin size={10} />
                  <span>{drone.distance}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FiRadio size={10} />
                  <span>{drone.signal > 0 ? `${drone.signal}%` : 'NO SIGNAL'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FiBattery size={10} style={{ color: drone.battery < 20 ? '#ff4444' : '#00ff88' }} />
                  <span style={{ color: drone.battery < 20 ? '#ff4444' : undefined }}>{drone.battery}%</span>
                </div>
                {drone.eta !== '—' && (
                  <div className="flex items-center gap-1">
                    <span className="text-drone-green">ETA: {drone.eta}</span>
                  </div>
                )}
              </div>

              {/* Battery bar */}
              {drone.status !== 'Offline' && (
                <div className="mt-2 h-1 bg-drone-bg rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${drone.battery}%`,
                      background: drone.battery < 20 ? '#ff4444' : drone.battery < 50 ? '#ffcc00' : '#00ff88',
                    }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer summary */}
      <div className="px-3 py-2 border-t border-drone-border bg-black/30 shrink-0">
        <div className="flex justify-between text-xs font-mono text-drone-text/50">
          <span>CLICK DRONE TO PLOT ROUTE</span>
          <span className="text-drone-accent">● {selected}</span>
        </div>
      </div>
    </div>
  );
}
