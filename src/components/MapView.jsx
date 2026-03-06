import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom SVG icon factory
const createIcon = (color, label, size = 36) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="2"/>
      <circle cx="18" cy="18" r="8" fill="${color}"/>
      <circle cx="18" cy="18" r="4" fill="white" fill-opacity="0.9"/>
    </svg>`;
  return L.divIcon({
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
      <div style="background:rgba(10,14,26,0.9);border:1px solid ${color};color:${color};
        font-size:10px;font-family:monospace;padding:2px 6px;border-radius:3px;
        white-space:nowrap;margin-bottom:4px;box-shadow:0 0 8px ${color}44;">${label}</div>
      ${svg}
    </div>`,
    className: '',
    iconSize: [size, size + 24],
    iconAnchor: [size / 2, size + 24],
    popupAnchor: [0, -(size + 24)],
  });
};

// Chennai flood zone coordinates (per user spec)
const LOCATIONS = {
  surveillance: [13.0827, 80.2707],
  rescue1:      [13.0850, 80.2750],
  rescue2:      [13.0800, 80.2650],
  rescue3:      [13.0870, 80.2680],
  victim:       [13.0835, 80.2685],
};

const MAP_CENTER = [13.0835, 80.2700];

const surveillanceIcon = createIcon('#00d4ff', 'SURV-01');
const rescue1Icon      = createIcon('#00ff88', 'RESC-01');
const rescue2Icon      = createIcon('#44aaff', 'RESC-02');
const rescue3Icon      = createIcon('#9966ff', 'RESC-03');
const victimIcon       = createIcon('#ff4444', '⚠ VICTIM', 40);

// Find nearest rescue drone to victim
function nearestRescueDrone(selectedDrone) {
  const key = selectedDrone || 'rescue1';
  return LOCATIONS[key] || LOCATIONS.rescue1;
}

export default function MapView({ selectedDrone = 'rescue1', personDetected = false }) {
  const routeStart = nearestRescueDrone(selectedDrone);
  const routeEnd   = LOCATIONS.victim;

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-drone-border">
      {/* Tactical header */}
      <div className="absolute top-0 left-0 right-0 z-[999] flex items-center justify-between px-3 py-2
        bg-drone-panel/90 backdrop-blur border-b border-drone-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-drone-green status-pulse-green" />
          <span className="text-xs font-mono text-drone-accent tracking-widest">TACTICAL MAP</span>
        </div>
        <div className="text-xs font-mono text-drone-text/50">
          LAT: 13.083° N · LON: 80.270° E
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          {personDetected && (
            <span className="text-drone-red animate-pulse">⚠ VICTIM LOCKED</span>
          )}
          <span className="text-drone-green">LIVE ●</span>
        </div>
      </div>

      <MapContainer
        center={MAP_CENTER}
        zoom={15}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OSM</a>'
        />
        <ZoomControl position="bottomright" />

        {/* Surveillance drone */}
        <Marker position={LOCATIONS.surveillance} icon={surveillanceIcon}>
          <Popup>
            <div className="font-mono text-xs p-1">
              <div className="font-bold" style={{ color: '#00d4ff' }}>SURV-01 · Surveillance</div>
              <div>Alt: 120m · Speed: 45 km/h</div>
              <div>Battery: 78% · Signal: Strong</div>
              <div>Coords: 13.0827°N, 80.2707°E</div>
            </div>
          </Popup>
        </Marker>

        {/* Rescue drones */}
        <Marker position={LOCATIONS.rescue1} icon={rescue1Icon}>
          <Popup>
            <div className="font-mono text-xs p-1">
              <div className="font-bold" style={{ color: '#00ff88' }}>RESC-01</div>
              <div>Status: {selectedDrone === 'rescue1' ? 'En Route ▶' : 'Available'}</div>
              <div>ETA: 1m 12s · Battery: 82%</div>
            </div>
          </Popup>
        </Marker>
        <Marker position={LOCATIONS.rescue2} icon={rescue2Icon}>
          <Popup>
            <div className="font-mono text-xs p-1">
              <div className="font-bold" style={{ color: '#44aaff' }}>RESC-02</div>
              <div>Status: {selectedDrone === 'rescue2' ? 'En Route ▶' : 'Standby'}</div>
              <div>Battery: 94% · Speed: 0 km/h</div>
            </div>
          </Popup>
        </Marker>
        <Marker position={LOCATIONS.rescue3} icon={rescue3Icon}>
          <Popup>
            <div className="font-mono text-xs p-1">
              <div className="font-bold" style={{ color: '#9966ff' }}>RESC-03</div>
              <div>Status: {selectedDrone === 'rescue3' ? 'En Route ▶' : 'Standby'}</div>
              <div>Battery: 67% · Speed: 0 km/h</div>
            </div>
          </Popup>
        </Marker>

        {/* Victim */}
        <Marker position={LOCATIONS.victim} icon={victimIcon}>
          <Popup>
            <div className="font-mono text-xs p-1">
              <div className="font-bold" style={{ color: '#ff4444' }}>⚠ VICTIM LOCATED</div>
              <div>{personDetected ? '● Confirmed via YOLOv8' : '● GPS Tracked'}</div>
              <div>Coords: 13.0835°N, 80.2685°E</div>
            </div>
          </Popup>
        </Marker>

        {/* Route polyline: selected rescue drone → victim */}
        <Polyline
          positions={[routeStart, routeEnd]}
          pathOptions={{
            color: personDetected ? '#ff4444' : '#00ff88',
            weight: 2,
            opacity: 0.85,
            dashArray: '7 5',
          }}
        />
      </MapContainer>

      {/* CRT overlay */}
      <div className="crt-overlay pointer-events-none" />

      {/* Legend */}
      <div className="absolute bottom-8 left-3 z-[999] bg-drone-panel/85 backdrop-blur border border-drone-border rounded p-2 text-xs font-mono space-y-1">
        <div className="flex items-center gap-2"><span style={{ color: '#00d4ff' }}>●</span> Surveillance</div>
        <div className="flex items-center gap-2"><span style={{ color: '#00ff88' }}>●</span> Rescue Drones</div>
        <div className="flex items-center gap-2"><span style={{ color: '#ff4444' }}>●</span> Victim</div>
        <div className="flex items-center gap-2"><span style={{ color: personDetected ? '#ff4444' : '#00ff88' }}>──</span> Route</div>
      </div>

      {/* Person detected banner */}
      {personDetected && (
        <div
          className="absolute top-12 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold animate-pulse"
          style={{ background: 'rgba(255,68,68,0.2)', border: '1px solid #ff444488', color: '#ff4444' }}
        >
          ⚠ VICTIM DETECTED · ROUTE UPDATED
        </div>
      )}
    </div>
  );
}
