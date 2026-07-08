'use client';
import { useState } from 'react';
import type { TeamMap } from '@/lib/debrief';

const FLAG_COLOR: Record<string, string> = { good: '#34d399', watch: '#f59e0b', warn: '#f87171' };

// The communication map (Build Addendum A2 "One Wall"): blue "spoke to each other"
// edges, with the amber "never happened" edges behind a facilitator reveal.
export function CommsMap({
  team,
  sessionId,
  keyParam,
  reveal = 'always',
  size = 520,
}: {
  team: TeamMap;
  sessionId: string;
  keyParam: string;
  reveal?: 'always' | 'toggle';
  size?: number;
}) {
  const [shown, setShown] = useState(reveal === 'always');
  const n = team.nodes.length;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const pos = new Map<string, { x: number; y: number }>();
  team.nodes.forEach((node, i) => {
    const a = (-90 + (i * 360) / Math.max(1, n)) * (Math.PI / 180);
    pos.set(node.seatKey, { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  });

  const edgeCurve = (from: string, to: string) => {
    const a = pos.get(from);
    const b = pos.get(to);
    if (!a || !b) return '';
    const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.12;
    const my = (a.y + b.y) / 2 - (b.x - a.x) * 0.12;
    return `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`;
  };

  return (
    <div className="commsmap">
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }}>
        {/* blue directed edges — what happened */}
        {team.blueEdges.map((e, i) => (
          <path key={`b${i}`} d={edgeCurve(e.from, e.to)} className="edge-blue" style={{ strokeWidth: 1 + Math.min(4, e.count) }} />
        ))}
        {/* amber "never happened" — revealed */}
        {shown &&
          team.amberEdges.map((e, i) => (
            <path key={`a${i}`} d={edgeCurve(e.from, e.to)} className="edge-amber" />
          ))}
        {/* nodes */}
        {team.nodes.map((node) => {
          const p = pos.get(node.seatKey)!;
          const initials = node.name
            .split(/\s+/)
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
          return (
            <a key={node.seatKey} href={`/facilitator/debrief/${sessionId}/${node.seatKey}${keyParam}`}>
              <g className="node">
                <circle cx={p.x} cy={p.y} r={26} fill="#11161d" stroke={FLAG_COLOR[node.flag]} strokeWidth={2.5} />
                <text x={p.x} y={p.y + 4} textAnchor="middle" className="node-init">
                  {initials}
                </text>
                <text x={p.x} y={p.y + 42} textAnchor="middle" className="node-name">
                  {node.name.split(' ')[0]}
                </text>
              </g>
            </a>
          );
        })}
      </svg>
      {reveal === 'toggle' ? (
        <button className="btn primary" onClick={() => setShown((s) => !s)}>
          {shown ? 'Hide what never happened' : 'Reveal what never happened'}
        </button>
      ) : null}
    </div>
  );
}
