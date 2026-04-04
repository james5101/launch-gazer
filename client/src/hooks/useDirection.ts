import { useEffect, useState } from 'react'
import { getDirection } from '@/api/client'
import type { DirectionResponse } from '@/api/types'

interface UseDirectionResult {
  direction: DirectionResponse | null
  loading: boolean
  error: string | null
}

export function useDirection(
  launchId: string | null,
  lat: number | null,
  lon: number | null,
): UseDirectionResult {
  const [direction, setDirection] = useState<DirectionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!launchId || lat === null || lon === null) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getDirection(launchId, lat, lon)
      .then((data) => { if (!cancelled) setDirection(data) })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load direction')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [launchId, lat, lon])

  return { direction, loading, error }
}
