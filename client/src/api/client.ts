import type { DirectionResponse, LaunchSummary } from './types'

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`)
  return res.json() as Promise<T>
}

export function getUpcomingLaunches(): Promise<LaunchSummary[]> {
  return apiFetch<LaunchSummary[]>('/launches/upcoming')
}

export function getLaunchById(id: string): Promise<LaunchSummary> {
  return apiFetch<LaunchSummary>(`/launches/${encodeURIComponent(id)}`)
}

export function getDirection(
  launchId: string,
  lat: number,
  lon: number,
): Promise<DirectionResponse> {
  return apiFetch<DirectionResponse>(
    `/launches/${encodeURIComponent(launchId)}/direction?lat=${lat}&lon=${lon}`,
  )
}
