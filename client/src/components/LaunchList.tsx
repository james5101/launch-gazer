import { useLaunches } from '@/hooks/useLaunches'
import { LaunchCard } from './LaunchCard'
import { LaunchGazerLogo } from './LaunchGazerLogo'

export function LaunchList() {
  const { launches, loading, error } = useLaunches()

  return (
    <div className="relative z-10 w-full max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-5 mb-5">
          <LaunchGazerLogo size={96} className="shrink-0" />
          <div>
            <div className="text-[10px] text-accent tracking-[0.2em] uppercase font-mono mb-2">
              Rocket Launch Tracker
            </div>
            <h1 className="text-5xl font-bold tracking-tight leading-none">
              LAUNCH<br />GAZER
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          Find your place in the sky.
        </p>
      </div>

      {/* Divider */}
      <div className="h-px bg-border mb-1" />

      {/* List header */}
      <div className="flex items-center gap-6 py-3 px-1 text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
        <span className="w-6 shrink-0" />
        <span className="flex-1">Mission</span>
        <span>Launch</span>
        <span className="w-4" />
      </div>

      <div className="h-px bg-border mb-1" />

      {/* States */}
      {loading && (
        <div className="py-16 text-center">
          <div className="text-xs text-accent tracking-widest uppercase animate-pulse font-mono">
            Acquiring signal...
          </div>
        </div>
      )}

      {error && (
        <div className="py-16 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Launch rows */}
      {!loading && !error && launches.map((launch, i) => (
        <LaunchCard key={launch.id} launch={launch} index={i} />
      ))}

      {/* Footer */}
      <div className="mt-16 pt-6 border-t border-border/30 text-center">
        <p className="text-[10px] text-muted-foreground/50 tracking-[0.15em] uppercase font-mono">
          Built for space nerds ·{' '}
          <a
            href="mailto:feedback@launchgazer.app"
            className="hover:text-accent transition-colors"
          >
            Send feedback
          </a>
        </p>
      </div>
    </div>
  )
}
