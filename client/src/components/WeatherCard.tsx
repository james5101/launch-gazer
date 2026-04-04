import type { ViewingLikelihood, WeatherConditions } from '@/api/types'
import { cn } from '@/lib/utils'

interface WeatherCardProps {
  weather: WeatherConditions
  likelihood: ViewingLikelihood
}

const likelihoodStyles: Record<string, string> = {
  'Excellent': 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  'Good':      'text-lime-400 border-lime-400/30 bg-lime-400/10',
  'Fair':      'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  'Poor':      'text-orange-400 border-orange-400/30 bg-orange-400/10',
  'Very Poor': 'text-red-400 border-red-400/30 bg-red-400/10',
}

export function WeatherCard({ weather, likelihood }: WeatherCardProps) {
  const badgeStyle = likelihoodStyles[likelihood.label] ?? likelihoodStyles['Fair']

  return (
    <div className="mt-6 border border-border/50 rounded-lg p-4 bg-white/[0.02]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
          Viewing Conditions
        </span>
        <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full border', badgeStyle)}>
          {likelihood.label} · {likelihood.score}/100
        </span>
      </div>

      {/* Summary */}
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        {weather.description} — {likelihood.summary}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: '☁', value: `${weather.cloud_cover_pct.toFixed(0)}%`, label: 'Cloud Cover' },
          { icon: '👁', value: `${weather.visibility_km} km`, label: 'Visibility' },
          { icon: '🌧', value: `${weather.precipitation_probability_pct.toFixed(0)}%`, label: 'Precipitation' },
        ].map(({ icon, value, label }) => (
          <div key={label} className="bg-white/[0.03] rounded-md p-2.5 text-center border border-border/30">
            <div className="text-base leading-none mb-1">{icon}</div>
            <div className="text-sm font-semibold">{value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
