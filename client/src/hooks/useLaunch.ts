import { useEffect, useState } from 'react'
import { getLaunchById } from '@/api/client'
import type { LaunchSummary } from '@/api/types'

export function useLaunch(id: string | undefined) {
  const [launch, setLaunch] = useState<LaunchSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setLaunch(null)

    getLaunchById(id)
      .then((data) => {
        if (!cancelled) setLaunch(data)
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Failed to load launch'
          setError(msg)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  return { launch, loading, error }
}
