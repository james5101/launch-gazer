import { useEffect, useState } from 'react'

interface CountdownProps {
  scheduledAt: string | null
  countdownSeconds: number | null
}

function formatCountdown(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (d > 0) return `T–${String(d).padStart(2, '0')}D ${String(h).padStart(2, '0')}H ${String(m).padStart(2, '0')}M`
  return `T–${String(h).padStart(2, '0')}H ${String(m).padStart(2, '0')}M ${String(s).padStart(2, '0')}S`
}

export function Countdown({ scheduledAt, countdownSeconds }: CountdownProps) {
  const [remaining, setRemaining] = useState<number | null>(countdownSeconds)

  useEffect(() => {
    if (!scheduledAt) return
    const target = new Date(scheduledAt).getTime()
    const tick = () => setRemaining(Math.max(0, Math.floor((target - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [scheduledAt])

  if (remaining === null) return (
    <span className="font-mono text-sm text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      TBD
    </span>
  )

  if (remaining <= 0) return (
    <span className="font-mono text-sm tracking-widest text-emerald-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      LAUNCHED
    </span>
  )

  const isClose = remaining < 3600
  return (
    <span
      className={`font-mono text-sm tracking-wider ${isClose ? 'text-accent' : 'text-muted-foreground'}`}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {formatCountdown(remaining)}
    </span>
  )
}
