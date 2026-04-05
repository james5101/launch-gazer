import type { TwilightPlumeInfo } from '@/api/types'
import { cn } from '@/lib/utils'

interface TwilightCardProps {
  twilight: TwilightPlumeInfo
}

const qualityStyles: Record<string, string> = {
  'Excellent': 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
  'Good':      'text-lime-400 border-lime-400/30 bg-lime-400/10',
  'Possible':  'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  'No effect': 'text-muted-foreground border-border/40 bg-white/[0.02]',
}

function fmtT(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `T+${m}m ${s.toString().padStart(2, '0')}s`
}

/** Mini SVG diagram showing sun angle vs shadow line geometry */
function PlumeDiagram({ sunAlt, shadowKm }: { sunAlt: number; shadowKm: number | null }) {
  // Layout: 200 wide × 110 tall, horizon at y=78
  const HORIZON_Y = 78
  const SKY_HEIGHT = HORIZON_Y          // 0..78 = sky
  const MAX_ALT_KM = 300               // km shown at top of diagram

  // Shadow line — clamp to visible area
  const shadowY = shadowKm != null
    ? Math.max(4, HORIZON_Y - (shadowKm / MAX_ALT_KM) * SKY_HEIGHT)
    : null

  // Sun position — below horizon, angle proportional (max −12° → 30px below)
  const depression = Math.min(Math.abs(sunAlt), 12)
  const sunY = HORIZON_Y + (depression / 12) * 28
  const SUN_X = 168

  // Sun ray endpoints: rays travel upper-left from the sun
  const rays = shadowY != null
    ? [
        { x1: SUN_X - 10, y1: sunY - 4,  x2: 30,  y2: shadowY + 2 },
        { x1: SUN_X - 10, y1: sunY,       x2: 80,  y2: shadowY + 2 },
        { x1: SUN_X - 10, y1: sunY + 4,  x2: 130, y2: shadowY + 2 },
      ]
    : []

  return (
    <svg
      viewBox="0 0 200 110"
      width="100%"
      aria-hidden="true"
      className="rounded-md overflow-hidden"
    >
      {/* Sky gradient */}
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#000510" />
          <stop offset="100%" stopColor="#0a1a2e" />
        </linearGradient>
        <linearGradient id="earthGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0d1117" />
          <stop offset="100%" stopColor="#060a10" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect x="0" y="0" width="200" height={HORIZON_Y} fill="url(#skyGrad)" />

      {/* Earth */}
      <rect x="0" y={HORIZON_Y} width="200" height={110 - HORIZON_Y} fill="url(#earthGrad)" />

      {/* Horizon line */}
      <line x1="0" y1={HORIZON_Y} x2="200" y2={HORIZON_Y}
        stroke="rgba(255,255,255,0.15)" strokeWidth="0.75" />

      {/* Shadow altitude line */}
      {shadowY != null && (
        <>
          <line x1="0" y1={shadowY} x2="200" y2={shadowY}
            stroke="rgba(0,229,255,0.35)" strokeWidth="0.75" strokeDasharray="4 3" />
          <text x="4" y={shadowY - 3} fill="rgba(0,229,255,0.6)"
            fontSize="6.5" fontFamily="JetBrains Mono, monospace">
            {shadowKm!.toFixed(0)} km
          </text>
        </>
      )}

      {/* Sun rays */}
      {rays.map((r, i) => (
        <line key={i}
          x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
          stroke="rgba(255,220,100,0.22)" strokeWidth="0.75" />
      ))}

      {/* Sun (below horizon) */}
      <circle cx={SUN_X} cy={sunY} r="7"
        fill="rgba(255,200,50,0.15)" stroke="rgba(255,200,50,0.5)" strokeWidth="0.75" />
      <circle cx={SUN_X} cy={sunY} r="4" fill="rgba(255,210,80,0.7)" />

      {/* Horizon label */}
      <text x="4" y={HORIZON_Y - 3} fill="rgba(255,255,255,0.25)"
        fontSize="6" fontFamily="JetBrains Mono, monospace">
        horizon
      </text>

      {/* Sun altitude label */}
      <text x={SUN_X + 10} y={sunY + 3} fill="rgba(255,200,50,0.7)"
        fontSize="6.5" fontFamily="JetBrains Mono, monospace">
        {sunAlt.toFixed(1)}°
      </text>
    </svg>
  )
}

export function TwilightCard({ twilight }: TwilightCardProps) {
  const badgeStyle = qualityStyles[twilight.quality] ?? qualityStyles['Possible']
  const isNoEffect = twilight.quality === 'No effect'

  return (
    <div className="mt-4 border border-border/50 rounded-lg p-4 bg-white/[0.02]">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
          Twilight Plume
        </span>
        <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full border', badgeStyle)}>
          {twilight.quality}
        </span>
      </div>

      {/* Headline */}
      <p className="text-sm font-medium mb-2 leading-snug">{twilight.headline}</p>

      {/* Geometry diagram — only for twilight launches */}
      {!isNoEffect && (
        <div className="mb-3 rounded-md overflow-hidden border border-border/30">
          <PlumeDiagram sunAlt={twilight.sun_altitude_deg} shadowKm={twilight.shadow_altitude_km} />
        </div>
      )}

      {/* Description */}
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        {twilight.description}
      </p>

      {/* Stats grid — only for twilight launches */}
      {!isNoEffect && <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/[0.03] rounded-md p-2.5 border border-border/30">
          <div className="text-[10px] text-muted-foreground mb-1">Sun Altitude</div>
          <div className="text-sm font-mono font-semibold">
            {twilight.sun_altitude_deg > 0 ? '+' : ''}{twilight.sun_altitude_deg.toFixed(1)}°
          </div>
        </div>

        {twilight.shadow_altitude_km != null && (
          <div className="bg-white/[0.03] rounded-md p-2.5 border border-border/30">
            <div className="text-[10px] text-muted-foreground mb-1">Shadow Line</div>
            <div className="text-sm font-mono font-semibold">
              {twilight.shadow_altitude_km.toFixed(0)} km
            </div>
          </div>
        )}

        {twilight.best_window_start_sec != null && (
          <div className="bg-white/[0.03] rounded-md p-2.5 border border-border/30 col-span-2">
            <div className="text-[10px] text-muted-foreground mb-1">Plume Illuminated From</div>
            <div className="text-sm font-mono font-semibold">
              {fmtT(twilight.best_window_start_sec)}
              {twilight.best_window_end_sec != null
                ? ` → ${fmtT(twilight.best_window_end_sec)}`
                : ''}
            </div>
          </div>
        )}
      </div>}
    </div>
  )
}
