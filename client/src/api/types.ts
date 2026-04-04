export interface PadInfo {
  name: string
  location: string
  lat: number
  lon: number
}

export interface LaunchSummary {
  id: string
  name: string
  provider: string
  rocket: string
  scheduled_at: string | null
  status: string
  pad: PadInfo
}

export interface WeatherConditions {
  cloud_cover_pct: number
  visibility_km: number
  precipitation_probability_pct: number
  description: string
}

export interface ViewingLikelihood {
  score: number
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Very Poor'
  summary: string
}

export interface DirectionResponse {
  launch_id: string
  launch_name: string
  bearing_deg: number
  bearing_label: string
  distance_km: number
  elevation_deg: number
  elevation_label: string
  visibility_note: string
  countdown_seconds: number | null
  weather: WeatherConditions | null
  likelihood: ViewingLikelihood | null
}
