import type { DirectionResponse, LaunchSummary } from '@/api/types'
import { Countdown } from './Countdown'
import { TwilightCard } from './TwilightCard'
import { WeatherCard } from './WeatherCard'

interface SkyViewProps {
  launch: LaunchSummary
  direction: DirectionResponse
  onBack: () => void
}

function bearingToXY(deg: number, r: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: 100 + r * Math.cos(rad), y: 100 + r * Math.sin(rad) }
}

const CARDINAL = [
  { label: 'N', deg: 0 },
  { label: 'E', deg: 90 },
  { label: 'S', deg: 180 },
  { label: 'W', deg: 270 },
]

export function SkyView({ launch, direction, onBack }: SkyViewProps) {
  const dotPos = bearingToXY(direction.bearing_deg, 72)

  return (
    <div className="relative z-10 w-full max-w-2xl mx-auto px-4 py-10">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1.5 group"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">‹</span>
          Missions
        </button>
        <Countdown scheduledAt={launch.scheduled_at} countdownSeconds={direction.countdown_seconds} />
      </div>

      {/* Mission name */}
      <div className="mb-6">
        <div className="text-[10px] text-accent tracking-[0.2em] uppercase font-mono mb-1 truncate">
          {launch.provider} · {launch.rocket}
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight uppercase leading-tight">{launch.name}</h2>
        <div className="text-xs text-muted-foreground mt-1">{launch.pad.location}</div>
      </div>

      {/* Main content: compass + bearing label — stacks on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 mb-8">
        {/* SVG Compass — scales down on mobile */}
        <div className="shrink-0 self-center sm:self-auto">
          <svg width="160" height="160" viewBox="0 0 200 200" aria-label="Compass" className="sm:w-[200px] sm:h-[200px]">
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <circle cx="100" cy="100" r="72" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            {Array.from({ length: 36 }, (_, i) => {
              const angle = (i * 10 * Math.PI) / 180
              const isMajor = i % 9 === 0
              const r1 = isMajor ? 82 : 86
              const r2 = 90
              return (
                <line
                  key={i}
                  x1={100 + r1 * Math.cos(angle - Math.PI / 2)}
                  y1={100 + r1 * Math.sin(angle - Math.PI / 2)}
                  x2={100 + r2 * Math.cos(angle - Math.PI / 2)}
                  y2={100 + r2 * Math.sin(angle - Math.PI / 2)}
                  stroke={isMajor ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}
                  strokeWidth={isMajor ? 1.5 : 0.75}
                />
              )
            })}
            {CARDINAL.map(({ label, deg }) => {
              const pos = bearingToXY(deg, 76)
              return (
                <text
                  key={label}
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  fill={label === 'N' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)'}
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="600"
                >
                  {label}
                </text>
              )
            })}
            <line x1="100" y1="100" x2={dotPos.x} y2={dotPos.y} stroke="rgba(0,229,255,0.25)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={dotPos.x} cy={dotPos.y} r="10" fill="rgba(0,229,255,0.12)" />
            <circle cx={dotPos.x} cy={dotPos.y} r="6" fill="rgba(0,229,255,0.25)" />
            <circle cx={dotPos.x} cy={dotPos.y} r="4" fill="#00E5FF" />
            <circle cx="100" cy="100" r="3" fill="rgba(255,255,255,0.6)" />
          </svg>
        </div>

        {/* Bearing info — full width on mobile so it doesn't clip */}
        <div className="flex-1 min-w-0">
          <div className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-none truncate">
            {direction.bearing_label.toUpperCase()}
          </div>
          <div className="text-muted-foreground mt-2 text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {direction.bearing_deg.toFixed(1)}°
          </div>
          <div className="text-muted-foreground text-sm mt-2">
            {direction.elevation_label}
          </div>
        </div>
      </div>

      {/* Data strip — single column on mobile, two on wider */}
      <div className="h-px bg-border/50 mb-4" />
      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2.5">
        {[
          { label: 'Distance', value: `${direction.distance_km.toLocaleString()} km` },
          { label: 'Launch Pad', value: launch.pad.name },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-sm gap-4">
            <span className="text-muted-foreground shrink-0">{label}</span>
            <span className="font-medium text-right">{value}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
        {direction.visibility_note}
      </p>

      {/* Cards section — scroll hint, weather, twilight plume */}
      {(direction.weather || direction.twilight) && (
        <div className="flex items-center gap-2 mt-6 mb-1">
          <div className="h-px flex-1 bg-border/30" />
          <span className="text-[10px] text-muted-foreground/50 tracking-widest">↓ SCROLL</span>
          <div className="h-px flex-1 bg-border/30" />
        </div>
      )}
      {direction.weather && direction.likelihood && (
        <WeatherCard weather={direction.weather} likelihood={direction.likelihood} />
      )}
      {direction.twilight && (
        <TwilightCard twilight={direction.twilight} />
      )}
    </div>
  )
}
