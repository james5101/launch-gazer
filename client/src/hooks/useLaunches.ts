import { useEffect, useState } from 'react'
import { getUpcomingLaunches } from '@/api/client'
import type { LaunchSummary } from '@/api/types'

interface UseLaunchesResult {
  launches: LaunchSummary[]
  loading: boolean
  error: string | null
}

export function useLaunches(): UseLaunchesResult {
  const [launches, setLaunches] = useState<LaunchSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getUpcomingLaunches()
      .then((data) => { if (!cancelled) setLaunches(data) })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load launches')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { launches, loading, error }
}
