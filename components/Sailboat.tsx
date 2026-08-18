'use client';
import { useState } from 'react';

// The leadership fingerprint drawn as a sailboat (the demo's rigging-diagram face). Each Tier-A
// marker is a fixed boat part; the fill of a sail IS its rate, the numeral sits on the part, and
// a marker with too little evidence renders as a hatched, unfilled sail — never a zero, never a
// ceiling. The coach is the lighthouse on the shore, its light on the boat. Labels flip between
// Plain and Insider vocabulary, scoped to the boat.

export interface BoatPart {
  key: string;
  name: string;
  value: number | null;   // difficulty-normalised rate, or null when insufficient
  trend: number | null;
  insufficient: boolean;
}

// fixed marker → part mapping (matches the reference build). A1 information-seeking is the leak.
const VOCAB: Record<string, { ins: string; plain: string }> = {
  A2: { ins: 'JIB', plain: 'STRENGTH' },
  A4: { ins: 'MAINSAIL', plain: 'STRENGTH' },
  A6: { ins: 'COMPASS', plain: 'YOUR READ' },
  A5: { ins: 'HELM', plain: 'FOLLOW-THROUGH' },
  A3: { ins: 'FLEET', plain: 'PEOPLE' },
  A1: { ins: 'THE LEAK', plain: 'GROWTH EDGE' },
  coach: { ins: 'LIGHTHOUSE', plain: 'YOUR GUIDE' },
};

const deltaText = (t: number | null) =>
  t === null ? '' : t === 0 ? ' · 0 —' : t > 0 ? ` · +${t} ▲` : ` · ${t} ▼`;
const valText = (p: BoatPart) => (p.insufficient || p.value === null ? 'n/a' : String(p.value));
const fillTop = (apexY: number, baseY: number, v: number) => baseY - (Math.max(0, Math.min(100, v)) / 100) * (baseY - apexY);

export function Sailboat({ parts }: { parts: Record<string, BoatPart> }) {
  const [insider, setInsider] = useState(true);
  const [hot, setHot] = useState<string | null>(null);
  const word = (k: string) => (insider ? VOCAB[k]?.ins : VOCAB[k]?.plain) ?? '';

  const P = (k: string): BoatPart => parts[k] ?? { key: k, name: k, value: null, trend: null, insufficient: true };
  const a1 = P('A1'), a2 = P('A2'), a3 = P('A3'), a4 = P('A4'), a5 = P('A5'), a6 = P('A6');

  const mainTop = a4.insufficient || a4.value === null ? 434 : fillTop(126, 434, a4.value);
  const jibTop = a2.insufficient || a2.value === null ? 432 : fillTop(150, 432, a2.value);
  const dim = (k: string) => (hot && hot !== k ? ' sb-dim' : '');
  const H = (k: string) => ({ onMouseEnter: () => setHot(k), onMouseLeave: () => setHot(null), onFocus: () => setHot(k), onBlur: () => setHot(null) });

  const readout = hot && parts[hot]
    ? `${parts[hot].name} · ${valText(parts[hot])}${deltaText(parts[hot].trend)}`
    : null;

  return (
    <div className="sb">
      <div className="sb-bar">
        <span className="sb-seg-l">Boat labels</span>
        <span className="sb-seg">
          <button aria-pressed={!insider} onClick={() => setInsider(false)}>Plain</button>
          <button aria-pressed={insider} onClick={() => setInsider(true)}>Insider</button>
        </span>
      </div>

      <svg className="sb-stage" viewBox="0 0 1040 680" role="img"
        aria-label="Your leadership markers drawn as a sailboat; the coach is a lighthouse casting light on the boat.">
        <defs>
          <clipPath id="sbMain"><rect x="470" y={mainTop} width="180" height={434 - mainTop} /></clipPath>
          <clipPath id="sbJib"><rect x="352" y={jibTop} width="130" height={432 - jibTop} /></clipPath>
          <linearGradient id="sbBeam" x1="188" y1="382" x2="512" y2="316" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#F2DCA0" stopOpacity=".30" />
            <stop offset="1" stopColor="#F2DCA0" stopOpacity="0" />
          </linearGradient>
          <pattern id="sbHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
            <rect width="10" height="10" fill="none" />
            <line x1="0" y1="0" x2="0" y2="10" stroke="#7C97B8" strokeWidth="4" opacity=".22" />
          </pattern>
        </defs>

        {/* construction lines */}
        <g stroke="#7C97B8" strokeWidth="1" strokeDasharray="4 5" opacity=".45" fill="none">
          <line x1="472" y1="120" x2="356" y2="432" /><line x1="472" y1="120" x2="636" y2="434" /><line x1="472" y1="126" x2="632" y2="434" />
        </g>

        {/* waterline + ticks */}
        <path d="M330 480 q22 -8 44 0 t44 0 t44 0 t44 0 t44 0 t44 0 t44 0 t44 0" stroke="#7C97B8" strokeWidth="1.4" opacity=".5" fill="none" />
        <g stroke="#7C97B8" opacity=".32" strokeWidth="1">
          {[350, 386, 422, 458, 494, 530, 566, 602, 638].map((x) => <line key={x} x1={x} y1="486" x2={x - 6} y2="496" />)}
        </g>

        {/* mast, boom, hull */}
        <g stroke="#93AECB" strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round">
          <line x1="472" y1="116" x2="472" y2="436" /><line x1="472" y1="436" x2="636" y2="436" />
          <polygon points="348,436 672,436 636,472 384,472" fill="rgba(147,174,203,.06)" />
        </g>
        <circle cx="472" cy="116" r="3.4" fill="#93AECB" />

        {/* JIB (A2 decision calibration) */}
        <g className={`sb-part${dim('A2')}`} tabIndex={0} {...H('A2')} aria-label={`Decision calibration, jib, ${valText(a2)}`}>
          <polygon points="466,150 356,432 468,434" fill={a2.insufficient ? 'url(#sbHatch)' : '#2B4A6F'} opacity={a2.insufficient ? 1 : .34} />
          {!a2.insufficient && <g clipPath="url(#sbJib)"><polygon points="466,150 356,432 468,434" fill="#3A5F8A" opacity=".82" /></g>}
          <polygon points="466,150 356,432 468,434" fill="none" stroke="#7C97B8" strokeWidth="1.3" />
          <text className="sb-n" x="410" y="366" fontSize="23" textAnchor="middle">{valText(a2)}</text>
        </g>

        {/* MAINSAIL (A4 truth-seeking) */}
        <g className={`sb-part${dim('A4')}`} tabIndex={0} {...H('A4')} aria-label={`Truth-seeking over comfort, mainsail, ${valText(a4)}`}>
          <polygon points="472,126 632,434 472,434" fill={a4.insufficient ? 'url(#sbHatch)' : '#2B4A6F'} opacity={a4.insufficient ? 1 : .42} />
          {!a4.insufficient && <g clipPath="url(#sbMain)"><polygon points="472,126 632,434 472,434" fill="#3A5F8A" opacity=".9" /></g>}
          <polygon points="472,126 632,434 472,434" fill="none" stroke="#7C97B8" strokeWidth="1.3" />
          <text className="sb-n" x="548" y="312" fontSize="27" textAnchor="middle" fill="#fff">{valText(a4)}</text>
        </g>

        {/* LEAK (A1 information-seeking) */}
        <g className={`sb-part${dim('A1')}`} tabIndex={0} {...H('A1')} aria-label={`Information-seeking, the leak, ${valText(a1)}`}>
          <line x1="402" y1="472" x2="402" y2="560" stroke="#CF6B3C" strokeWidth="1.2" strokeDasharray="3 4" />
          <ellipse cx="402" cy="470" rx="9" ry="5" fill="#CF6B3C" />
          <circle cx="398" cy="484" r="2.6" fill="#CF6B3C" opacity=".8" /><circle cx="407" cy="493" r="2.2" fill="#CF6B3C" opacity=".6" />
          <text className="sb-n" x="452" y="474" fontSize="22" fill="#E08A5E">{valText(a1)}</text>
        </g>

        {/* COMPASS (A6 composure) */}
        <g className={`sb-part${dim('A6')}`} tabIndex={0} {...H('A6')} aria-label={`Composure under escalation, compass, ${valText(a6)}`}>
          <circle cx="704" cy="190" r="30" fill="#12253C" stroke="#7C97B8" strokeWidth="1.4" />
          <g stroke="#7C97B8" strokeWidth="1" opacity=".5">
            <line x1="704" y1="164" x2="704" y2="170" /><line x1="704" y1="210" x2="704" y2="216" /><line x1="678" y1="190" x2="684" y2="190" /><line x1="724" y1="190" x2="730" y2="190" />
          </g>
          <line x1="704" y1="190" x2="720" y2="176" stroke="#E08A5E" strokeWidth="2" strokeLinecap="round" />
          <line x1="704" y1="190" x2="695" y2="200" stroke="#93AECB" strokeWidth="2" strokeLinecap="round" />
          <circle cx="704" cy="190" r="2.4" fill="#E8EDF2" />
          <text className="sb-n" x="704" y="250" fontSize="20" textAnchor="middle">{valText(a6)}</text>
        </g>

        {/* HELM (A5 intent-action) */}
        <g className={`sb-part${dim('A5')}`} tabIndex={0} {...H('A5')} aria-label={`Intent-action integrity, helm, ${valText(a5)}`}>
          <g transform="translate(650,430)" stroke="#7C97B8" strokeWidth="1.6" fill="none">
            <circle r="19" /><circle r="6" fill="#12253C" />
            <line x1="0" y1="-19" x2="0" y2="-26" /><line x1="0" y1="19" x2="0" y2="26" /><line x1="-19" y1="0" x2="-26" y2="0" /><line x1="19" y1="0" x2="26" y2="0" />
            <line x1="-13.4" y1="-13.4" x2="-18.4" y2="-18.4" /><line x1="13.4" y1="-13.4" x2="18.4" y2="-18.4" /><line x1="-13.4" y1="13.4" x2="-18.4" y2="18.4" /><line x1="13.4" y1="13.4" x2="18.4" y2="18.4" />
          </g>
          <circle cx="650" cy="430" r="2.4" fill="#E8EDF2" />
          <text className="sb-n" x="650" y="392" fontSize="20" textAnchor="middle">{valText(a5)}</text>
        </g>

        {/* FLEET (A3 consultation) */}
        <g className={`sb-part${dim('A3')}`} tabIndex={0} {...H('A3')} aria-label={`Consultation breadth, fleet, ${valText(a3)}`}>
          <g stroke="#7C97B8" strokeWidth="1.4" fill="none" strokeLinejoin="round">
            <polygon points="700,438 726,438 720,450 706,450" /><line x1="713" y1="418" x2="713" y2="438" /><path d="M713 420 L724 436 L713 436 Z" fill="rgba(147,174,203,.12)" />
            <polygon points="730,446 752,446 747,456 735,456" /><line x1="741" y1="430" x2="741" y2="446" /><path d="M741 432 L750 444 L741 444 Z" fill="rgba(147,174,203,.12)" />
          </g>
          <text className="sb-n" x="712" y="410" fontSize="20" textAnchor="middle">{valText(a3)}</text>
        </g>

        {/* the coach = lighthouse */}
        <g className={`sb-part${dim('coach')}`} tabIndex={0} {...H('coach')} aria-label="The coach, a lighthouse casting light on the boat">
          <polygon points="186,384 520,244 506,438" fill="url(#sbBeam)" />
          <path d="M140 470 Q146 460 168 460 L196 460 Q214 460 220 470 Z" fill="#12253C" stroke="#7C97B8" strokeWidth="1" />
          <polygon points="160,462 200,462 192,390 168,390" fill="#0E1D31" stroke="#93AECB" strokeWidth="1.4" />
          <line x1="167" y1="422" x2="193" y2="422" stroke="#7C97B8" strokeWidth="4" opacity=".45" /><line x1="165" y1="446" x2="195" y2="446" stroke="#7C97B8" strokeWidth="4" opacity=".45" />
          <rect x="165" y="378" width="30" height="13" fill="#12253C" stroke="#93AECB" strokeWidth="1.2" />
          <path d="M166 378 L180 365 L194 378 Z" fill="#93AECB" /><line x1="180" y1="365" x2="180" y2="359" stroke="#93AECB" strokeWidth="1.4" />
          <circle cx="180" cy="384" r="9" fill="#F2DCA0" opacity=".28" /><circle cx="180" cy="384" r="4" fill="#F6E4B0" />
        </g>

        {/* ===== callouts ===== */}
        <g className="sb-lbl">
          <text className="sb-name" x="150" y="236">Decision calibration</text>
          <text className="sb-sub" x="150" y="255">{word('A2')}{' · '}{valText(a2)}{deltaText(a2.trend)}</text>
          <line x1="180" y1="266" x2="180" y2="300" stroke="#7C97B8" strokeWidth="1" strokeDasharray="3 4" opacity=".55" /><line x1="180" y1="300" x2="424" y2="300" stroke="#7C97B8" strokeWidth="1" strokeDasharray="3 4" opacity=".55" />
        </g>
        <g className="sb-lbl">
          <line x1="180" y1="464" x2="180" y2="502" stroke="#7C97B8" strokeWidth="1" strokeDasharray="3 4" opacity=".5" />
          <text className="sb-name" x="126" y="516">The coach</text>
          <text className="sb-sub" x="126" y="535">{word('coach')}{' · GROUNDED · CITES ONLY'}</text>
        </g>
        <g className="sb-lbl">
          <text className="sb-name" x="760" y="184">Composure under escalation</text>
          <text className="sb-sub" x="760" y="203">{word('A6')}{' · '}{valText(a6)}{deltaText(a6.trend)}</text>
        </g>
        <g className="sb-lbl">
          <line x1="596" y1="300" x2="754" y2="300" stroke="#7C97B8" strokeWidth="1" strokeDasharray="3 4" opacity=".55" />
          <text className="sb-name" x="762" y="300">Truth-seeking over comfort</text>
          <text className="sb-sub" x="762" y="319">{word('A4')}{' · '}{valText(a4)}{deltaText(a4.trend)}</text>
        </g>
        <g className="sb-lbl">
          <line x1="676" y1="424" x2="754" y2="418" stroke="#7C97B8" strokeWidth="1" strokeDasharray="3 4" opacity=".55" />
          <text className="sb-name" x="762" y="418">Intent–action integrity</text>
          <text className="sb-sub" x="762" y="437">{word('A5')}{' · '}{valText(a5)}{deltaText(a5.trend)}</text>
        </g>
        <g className="sb-lbl">
          <line x1="745" y1="450" x2="754" y2="502" stroke="#7C97B8" strokeWidth="1" strokeDasharray="3 4" opacity=".55" />
          <text className="sb-name" x="762" y="502">Consultation breadth</text>
          <text className="sb-sub" x="762" y="521">{word('A3')}{' · '}{valText(a3)}{deltaText(a3.trend)}</text>
        </g>
        <g className="sb-lbl">
          <text className="sb-name sb-leak" x="402" y="586" textAnchor="middle">Information-seeking</text>
          <text className="sb-sub sb-leak" x="402" y="605" textAnchor="middle">{word('A1')}{' · '}{valText(a1)}{deltaText(a1.trend)}</text>
        </g>

        <text className="sb-subcap" x="60" y="556">SAIL FILL = MARKER RATE · DIFFICULTY-NORMALISED</text>
        {readout
          ? <text className="sb-readout" x="60" y="640">{readout}</text>
          : <><text className="sb-foot" x="60" y="632"><tspan fontWeight="600" fill="#E8EDF2">Numerals sit on the parts, not only in the labels.</tspan></text>
             <text className="sb-foot" x="60" y="651">Fill gives the gestalt in a glance; the number does the reading.</text></>}

        <g className="sb-legend">
          <line x1="720" y1="628" x2="748" y2="628" stroke="#93AECB" strokeWidth="2" /><text x="754" y="632">MEASURED</text>
          <line x1="838" y1="628" x2="866" y2="628" stroke="#7C97B8" strokeWidth="1.4" strokeDasharray="4 4" /><text x="872" y="632">CONSTRUCTION</text>
          <line x1="720" y1="650" x2="748" y2="650" stroke="#CF6B3C" strokeWidth="2" /><text x="754" y="654">THE LEAK</text>
        </g>
      </svg>
    </div>
  );
}
