import type { Memory } from '../api/types';

/**
 * Simplified outline of Ethiopia (lon 33–48°E, lat 3.4–14.9°N) with memory pins.
 * Good enough for a book spread; swap in real boundary data for a precise map.
 */
const OUTLINE = '81.6,14.4 117.6,2.4 144,9.6 168,12 206.4,36 225.6,60 211.2,81.6 237.6,96 249.6,134.4 264,144 312,168 357.6,168 288,240 264,242.4 216,261.6 192,266.4 158.4,278.4 122.4,273.6 93.6,254.4 69.6,249.6 55.2,230.4 38.4,213.6 0,172.8 14.4,158.4 26.4,153.6 26.4,129.6 33.6,105.6 45.6,88.8 62.4,57.6 74.4,55.2';

const project = (lat: number, lng: number) => ({ x: (lng - 33) * 24, y: (15 - lat) * 24 });

export interface MapPin {
  lat: number;
  lng: number;
  label?: string;
  kind?: 'visited' | 'next';
}

export function pinsFromMemories(memories: Memory[]): MapPin[] {
  const seen = new Set<string>();
  const pins: MapPin[] = [];
  for (const m of memories) {
    if (m.latitude == null || m.longitude == null) continue;
    const key = (m.placeName ?? m.title).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    pins.push({ lat: m.latitude, lng: m.longitude, label: m.placeName ?? undefined, kind: 'visited' });
  }
  return pins;
}

export function EthiopiaMap({ pins, route = true, width = 300 }: { pins: MapPin[]; route?: boolean; width?: number }) {
  const visited = pins.filter((p) => p.kind !== 'next');
  const routePoints = visited.map((p) => project(p.lat, p.lng)).map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <svg viewBox="-10 -10 380 300" width={width} height={(width * 300) / 380} role="img"
      aria-label={`Map of Ethiopia with ${visited.length} visited places`}>
      <polygon points={OUTLINE} fill="#E2F2E6" stroke="#06742A" strokeWidth={2} strokeLinejoin="round" />
      {route && visited.length > 1 ? (
        <polyline points={routePoints} fill="none" stroke="#0B3D23" strokeWidth={2.5} strokeDasharray="6 5"
          strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
      {pins.map((p, i) => {
        const { x, y } = project(p.lat, p.lng);
        const next = p.kind === 'next';
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={next ? 6 : 5.5} fill={next ? '#FCDD09' : '#DA121A'} stroke={next ? '#B7851A' : '#fff'} strokeWidth={next ? 1.5 : 2} />
            {p.label ? (
              <text x={x + 8} y={y + 4} fontFamily="Inter, sans-serif" fontSize={11} fontWeight={next ? 400 : 600} fill={next ? '#5E4600' : '#1D1A14'}>
                {p.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
