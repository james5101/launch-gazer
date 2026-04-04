import { useState } from 'react'

interface GeolocationResult {
  lat: number | null
  lon: number | null
  loading: boolean
  error: string | null
  request: () => void
}

export function useGeolocation(): GeolocationResult {
  const [lat, setLat] = useState<number | null>(null)
  const [lon, setLon] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const request = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLon(pos.coords.longitude)
        setLoading(false)
      },
      () => {
        setError('Location access denied. Please allow location access and try again.')
        setLoading(false)
      },
      { timeout: 10000 },
    )
  }

  return { lat, lon, loading, error, request }
}
