import type { LaunchSummary } from '@/api/types'
import { Countdown } from './Countdown'

interface LaunchCardProps {
  launch: LaunchSummary
  index: number
  onClick: (launch: LaunchSummary) => void
}

export function LaunchCard({ launch, index, onClick }: LaunchCardProps) {
  const formattedDate = launch.scheduled_at
    ? new Date(launch.scheduled_at).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : 'TBD'

  return (
    <button
      onClick={() => onClick(launch)}
      className="group w-full text-left border-b border-border/50 py-4 px-1 flex items-start gap-4 hover:bg-white/[0.02] transition-colors relative"
    >
      {/* Hover accent bar */}
      <span className="absolute left-0 top-0 h-full w-[2px] bg-accent scale-y-0 group-hover:scale-y-100 transition-transform origin-center rounded-full" />

      {/* Mission number */}
      <span
        className="text-muted-foreground text-sm w-6 shrink-0 select-none pt-0.5"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      {/* Mission info — allows name to wrap on mobile */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-foreground text-sm tracking-wide uppercase leading-snug">
          {launch.name}
        </div>
        <div className="text-muted-foreground text-xs mt-0.5 leading-snug">
          {launch.provider} · {launch.pad.location}
        </div>
      </div>

      {/* Date + countdown — right aligned, shrinks but never truncates the countdown */}
      <div className="text-right shrink-0 ml-2">
        <div className="text-xs text-muted-foreground whitespace-nowrap">{formattedDate}</div>
        <div className="mt-0.5 whitespace-nowrap">
          <Countdown scheduledAt={launch.scheduled_at} countdownSeconds={null} />
        </div>
      </div>

      {/* Arrow */}
      <span className="text-muted-foreground group-hover:text-accent transition-colors text-lg shrink-0 self-center">›</span>
    </button>
  )
}
