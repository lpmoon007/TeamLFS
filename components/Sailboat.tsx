'use client';
import { useState } from 'react';

// The leadership fingerprint drawn as a sailboat. Each Tier-A marker is a fixed boat part; the
// fill of a sail IS its rate, the numeral sits on the part, and a marker with too little evidence
// draws as a hatched, unfilled sail — never a zero, never a ceiling. The LEAK is dynamic: the
// lowest scored marker is your growth edge, and it takes the orange "the leak" treatment wherever
// it sits. The coach is the lighthouse on the shore, its light on the boat. Labels flip between
// Plain and Insider vocabulary, scoped to the boat. Light register, to match the profile page.

export interface BoatPart {
  key: string;
  name: string;
  value: number | null;   // difficulty-normalised rate, or null when insufficient
  trend: number | null;
  insufficient: boolean;
}

const VOCAB: Record<string, { ins: string; plain: string }> = {
  A2: { ins: 'JIB', plain: 'STRENGTH' },
  A4: { ins: 'MAINSAIL', plain: 'STRENGTH' },
  A6: { ins: 'COMPASS', plain: 'YOUR READ' },
  A5: { ins: 'HELM', plain: 'FOLLOW-THROUGH' },
  A3: { ins: 'FLEET', plain: 'PEOPLE' },
  A1: { ins: 'THE HULL', plain: 'INTAKE' },
  coach: { ins: 'LIGHTHOUSE', plain: 'YOUR GUIDE' },
};

const LEAK = '#C85A25';
const deltaText = (t: number | null) => (t === null ? '' : t === 0 ? ' · 0 —' : t > 0 ? ` · +${t} ▲` : ` · ${t} ▼`);
const valText = (p: BoatPart) => (p.insufficient || p.value === null ? 'n/a' : String(p.value));
const fillTop = (apexY: number, baseY: number, v: number) => baseY - (Math.max(0, Math.min(100, v)) / 100) * (baseY - apexY);

export function Sailboat({ parts }: { parts: Record<string, BoatPart> }) {
  const [insider, setInsider] = useState(true);
  const [hot, setHot] = useState<string | null>(null);
  const word = (k: string) => (insider ? VOCAB[k]?.ins : VOCAB[k]?.plain) ?? '';

  const P = (k: string): BoatPart => parts[k] ?? { key: k, name: k, value: null, trend: null, insufficient: true };
  const a1 = P('A1'), a2 = P('A2'), a3 = P('A3'), a4 = P('A4'), a5 = P('A5'), a6 = P('A6');

  // dynamic leak: the lowest scored marker is the growth edge, wherever it sits
  const scored = [a1, a2, a3, a4, a5, a6].filter((p) => !p.insufficient && p.value !== null);
  const leakKey = scored.length ? scored.reduce((lo, p) => ((p.value as number) < (lo.value as number) ? p : lo)).key : null;
  const isLeak = (k: string) => k === leakKey;
  const nCls = (k: string) => `sb-n${isLeak(k) ? ' lk' : ''}`;

  const mainTop = a4.insufficient || a4.value === null ? 434 : fillTop(126, 434, a4.value);
  const jibTop = a2.insufficient || a2.value === null ? 432 : fillTop(150, 432, a2.value);
  const dim = (k: string) => (hot && hot !== k ? ' sb-dim' : '');
  const H = (k: string) => ({ onMouseEnter: () => setHot(k), onMouseLeave: () => setHot(null), onFocus: () => setHot(k), onBlur: () => setHot(null) });

  // a callout sub-line: WORD · value · delta, plus an orange "THE LEAK" chip if this is the gap
  const Sub = (k: string, p: BoatPart, x: number, y: number, leak = false) => (
    <text className={`sb-sub${leak ? ' sb-leak' : ''}`} x={x} y={y} textAnchor={leak ? 'middle' : 'start'}>
      {word(k)}{' · '}{valText(p)}{deltaText(p.trend)}
      {isLeak(k) ? <tspan className="sb-chip"> · THE LEAK</tspan> : null}
    </text>
  );

  const readout = hot && parts[hot]
    ? `${parts[hot].name} · ${valText(parts[hot])}${deltaText(parts[hot].trend)}${isLeak(hot) ? ' · the leak' : ''}`
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
        aria-label="Your leadership markers drawn as a sailboat; the lowest marker is the leak; the coach is a lighthouse casting light on the boat.">
        <defs>
          <clipPath id="sbMain"><rect x="470" y={mainTop} width="180" height={434 - mainTop} /></clipPath>
          <clipPath id="sbJib"><rect x="352" y={jibTop} width="130" height={432 - jibTop} /></clipPath>
          <linearGradient id="sbBeam" x1="188" y1="382" x2="512" y2="316" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#F0C24E" stopOpacity=".34" />
            <stop offset="1" stopColor="#F0C24E" stopOpacity="0" />
          </linearGradient>
          <pattern id="sbHatch" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill="#EDF2F8" />
            <line x1="0" y1="0" x2="0" y2="10" stroke="#9CB3CE" strokeWidth="4" opacity=".5" />
          </pattern>
        </defs>

        {/* construction lines */}
        <g stroke="#A9BED6" strokeWidth="1" strokeDasharray="4 5" opacity=".8" fill="none">
          <line x1="472" y1="120" x2="356" y2="432" /><line x1="472" y1="120" x2="636" y2="434" /><line x1="472" y1="126" x2="632" y2="434" />
        </g>

        {/* waterline + ticks */}
        <path d="M330 480 q22 -8 44 0 t44 0 t44 0 t44 0 t44 0 t44 0 t44 0 t44 0" stroke="#7FA0C4" strokeWidth="1.4" opacity=".7" fill="none" />
        <g stroke="#A9BED6" opacity=".7" strokeWidth="1">
          {[350, 386, 422, 458, 494, 530, 566, 602, 638].map((x) => <line key={x} x1={x} y1="486" x2={x - 6} y2="496" />)}
        </g>

        {/* mast, boom, hull */}
        <g stroke="#21507F" strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round">
          <line x1="472" y1="116" x2="472" y2="436" /><line x1="472" y1="436" x2="636" y2="436" />
          <polygon points="348,436 672,436 636,472 384,472" fill="rgba(33,80,127,.05)" />
        </g>
        <circle cx="472" cy="116" r="3.4" fill="#21507F" />

        {/* JIB (A2) */}
        <g className={`sb-part${dim('A2')}`} tabIndex={0} {...H('A2')} aria-label={`Decision calibration, jib, ${valText(a2)}`}>
          <polygon points="466,150 356,432 468,434" fill={a2.insufficient ? 'url(#sbHatch)' : '#E6EEF7'} />
          {!a2.insufficient && <g clipPath="url(#sbJib)"><polygon points="466,150 356,432 468,434" fill="#6F9AD0" opacity=".92" /></g>}
          <polygon points="466,150 356,432 468,434" fill="none" stroke="#6E90B8" strokeWidth="1.3" />
          <text className={nCls('A2')} x="410" y="366" fontSize="23" textAnchor="middle">{valText(a2)}</text>
        </g>

        {/* MAINSAIL (A4) */}
        <g className={`sb-part${dim('A4')}`} tabIndex={0} {...H('A4')} aria-label={`Truth-seeking over comfort, mainsail, ${valText(a4)}`}>
          <polygon points="472,126 632,434 472,434" fill={a4.insufficient ? 'url(#sbHatch)' : '#E6EEF7'} />
          {!a4.insufficient && <g clipPath="url(#sbMain)"><polygon points="472,126 632,434 472,434" fill="#6F9AD0" opacity=".95" /></g>}
          <polygon points="472,126 632,434 472,434" fill="none" stroke="#6E90B8" strokeWidth="1.3" />
          <text className={nCls('A4')} x="548" y="312" fontSize="27" textAnchor="middle">{valText(a4)}</text>
        </g>

        {/* HULL / info-seeking (A1) — orange leak visual only when it is the gap */}
        <g className={`sb-part${dim('A1')}`} tabIndex={0} {...H('A1')} aria-label={`Information-seeking, ${valText(a1)}${isLeak('A1') ? ', the leak' : ''}`}>
          {isLeak('A1') ? (
            <>
              <line x1="402" y1="472" x2="402" y2="560" stroke={LEAK} strokeWidth="1.2" strokeDasharray="3 4" />
              <ellipse cx="402" cy="470" rx="9" ry="5" fill={LEAK} />
              <circle cx="398" cy="484" r="2.6" fill={LEAK} opacity=".8" /><circle cx="407" cy="493" r="2.2" fill={LEAK} opacity=".6" />
            </>
          ) : (
            <ellipse cx="402" cy="470" rx="8" ry="4.5" fill="#EEF3F9" stroke="#6E90B8" strokeWidth="1.2" />
          )}
          <text className={nCls('A1')} x="452" y="474" fontSize="22">{valText(a1)}</text>
        </g>

        {/* COMPASS (A6) */}
        <g className={`sb-part${dim('A6')}`} tabIndex={0} {...H('A6')} aria-label={`Composure under escalation, compass, ${valText(a6)}`}>
          <circle cx="704" cy="190" r="30" fill="#EEF3F9" stroke="#6E90B8" strokeWidth="1.4" />
          <g stroke="#6E90B8" strokeWidth="1" opacity=".6">
            <line x1="704" y1="164" x2="704" y2="170" /><line x1="704" y1="210" x2="704" y2="216" /><line x1="678" y1="190" x2="684" y2="190" /><line x1="724" y1="190" x2="730" y2="190" />
          </g>
          <line x1="704" y1="190" x2="720" y2="176" stroke={LEAK} strokeWidth="2" strokeLinecap="round" />
          <line x1="704" y1="190" x2="695" y2="200" stroke="#21507F" strokeWidth="2" strokeLinecap="round" />
          <circle cx="704" cy="190" r="2.4" fill="#0C2340" />
          <text className={nCls('A6')} x="704" y="250" fontSize="20" textAnchor="middle">{valText(a6)}</text>
        </g>

        {/* HELM (A5) */}
        <g className={`sb-part${dim('A5')}`} tabIndex={0} {...H('A5')} aria-label={`Intent-action integrity, helm, ${valText(a5)}`}>
          <g transform="translate(650,430)" stroke="#6E90B8" strokeWidth="1.6" fill="none">
            <circle r="19" /><circle r="6" fill="#EEF3F9" />
            <line x1="0" y1="-19" x2="0" y2="-26" /><line x1="0" y1="19" x2="0" y2="26" /><line x1="-19" y1="0" x2="-26" y2="0" /><line x1="19" y1="0" x2="26" y2="0" />
            <line x1="-13.4" y1="-13.4" x2="-18.4" y2="-18.4" /><line x1="13.4" y1="-13.4" x2="18.4" y2="-18.4" /><line x1="-13.4" y1="13.4" x2="-18.4" y2="18.4" /><line x1="13.4" y1="13.4" x2="18.4" y2="18.4" />
          </g>
          <circle cx="650" cy="430" r="2.4" fill="#0C2340" />
          <text className={nCls('A5')} x="650" y="392" fontSize="20" textAnchor="middle">{valText(a5)}</text>
        </g>

        {/* FLEET (A3) */}
        <g className={`sb-part${dim('A3')}`} tabIndex={0} {...H('A3')} aria-label={`Consultation breadth, fleet, ${valText(a3)}`}>
          <g stroke="#6E90B8" strokeWidth="1.4" fill="none" strokeLinejoin="round">
            <polygon points="700,438 726,438 720,450 706,450" /><line x1="713" y1="418" x2="713" y2="438" /><path d="M713 420 L724 436 L713 436 Z" fill="rgba(33,80,127,.10)" />
            <polygon points="730,446 752,446 747,456 735,456" /><line x1="741" y1="430" x2="741" y2="446" /><path d="M741 432 L750 444 L741 444 Z" fill="rgba(33,80,127,.10)" />
          </g>
          <text className={nCls('A3')} x="712" y="410" fontSize="20" textAnchor="middle">{valText(a3)}</text>
        </g>

        {/* the coach = lighthouse */}
        <g className={`sb-part${dim('coach')}`} tabIndex={0} {...H('coach')} aria-label="The coach, a lighthouse casting light on the boat">
          <polygon points="186,384 520,244 506,438" fill="url(#sbBeam)" />
          <path d="M140 470 Q146 460 168 460 L196 460 Q214 460 220 470 Z" fill="#EEF3F9" stroke="#6E90B8" strokeWidth="1" />
          <polygon points="160,462 200,462 192,390 168,390" fill="#F6F9FC" stroke="#21507F" strokeWidth="1.4" />
          <line x1="167" y1="422" x2="193" y2="422" stroke="#6E90B8" strokeWidth="4" opacity=".55" /><line x1="165" y1="446" x2="195" y2="446" stroke="#6E90B8" strokeWidth="4" opacity=".55" />
          <rect x="165" y="378" width="30" height="13" fill="#EEF3F9" stroke="#21507F" strokeWidth="1.2" />
          <path d="M166 378 L180 365 L194 378 Z" fill="#21507F" /><line x1="180" y1="365" x2="180" y2="359" stroke="#21507F" strokeWidth="1.4" />
          <circle cx="180" cy="384" r="9" fill="#F0C24E" opacity=".45" /><circle cx="180" cy="384" r="4" fill="#E7A72E" />
        </g>

        {/* ===== callouts ===== */}
        <g className="sb-lbl">
          <text className="sb-name" x="150" y="236">Decision calibration</text>
          {Sub('A2', a2, 150, 255)}
          <line x1="180" y1="266" x2="180" y2="300" stroke="#A9BED6" strokeWidth="1" strokeDasharray="3 4" /><line x1="180" y1="300" x2="424" y2="300" stroke="#A9BED6" strokeWidth="1" strokeDasharray="3 4" />
        </g>
        <g className="sb-lbl">
          <line x1="180" y1="464" x2="180" y2="502" stroke="#A9BED6" strokeWidth="1" strokeDasharray="3 4" />
          <text className="sb-name" x="126" y="516">The coach</text>
          <text className="sb-sub" x="126" y="535">{word('coach')}{' · GROUNDED · CITES ONLY'}</text>
        </g>
        <g className="sb-lbl">
          <text className="sb-name" x="760" y="184">Composure under escalation</text>
          {Sub('A6', a6, 760, 203)}
        </g>
        <g className="sb-lbl">
          <line x1="596" y1="300" x2="754" y2="300" stroke="#A9BED6" strokeWidth="1" strokeDasharray="3 4" />
          <text className="sb-name" x="762" y="300">Truth-seeking over comfort</text>
          {Sub('A4', a4, 762, 319)}
        </g>
        <g className="sb-lbl">
          <line x1="676" y1="424" x2="754" y2="418" stroke="#A9BED6" strokeWidth="1" strokeDasharray="3 4" />
          <text className="sb-name" x="762" y="418">Intent–action integrity</text>
          {Sub('A5', a5, 762, 437)}
        </g>
        <g className="sb-lbl">
          <line x1="745" y1="450" x2="754" y2="502" stroke="#A9BED6" strokeWidth="1" strokeDasharray="3 4" />
          <text className="sb-name" x="762" y="502">Consultation breadth</text>
          {Sub('A3', a3, 762, 521)}
        </g>
        <g className="sb-lbl">
          <text className={`sb-name${isLeak('A1') ? ' sb-leak' : ''}`} x="402" y="586" textAnchor="middle">Information-seeking</text>
          {Sub('A1', a1, 402, 605, true)}
        </g>

        <text className="sb-subcap" x="60" y="556">SAIL FILL = MARKER RATE · DIFFICULTY-NORMALISED</text>
        {readout
          ? <text className="sb-readout" x="60" y="640">{readout}</text>
          : <><text className="sb-foot" x="60" y="632"><tspan fontWeight="600" fill="#16324F">The leak is your lowest marker.</tspan></text>
             <text className="sb-foot" x="60" y="651">Fill gives the gestalt in a glance; the number does the reading.</text></>}

        <g className="sb-legend">
          <line x1="720" y1="628" x2="748" y2="628" stroke="#21507F" strokeWidth="2" /><text x="754" y="632">MEASURED</text>
          <line x1="838" y1="628" x2="866" y2="628" stroke="#A9BED6" strokeWidth="1.4" strokeDasharray="4 4" /><text x="872" y="632">CONSTRUCTION</text>
          <line x1="720" y1="650" x2="748" y2="650" stroke={LEAK} strokeWidth="2" /><text x="754" y="654">THE LEAK</text>
        </g>
      </svg>
    </div>
  );
}
