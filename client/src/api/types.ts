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

export interface TwilightPlumeInfo {
  /** Sun's altitude at launch time in degrees. Negative = below horizon. */
  sun_altitude_deg: number
  /** Altitude in km where the exhaust plume enters direct sunlight. Null for daytime/night. */
  shadow_altitude_km: number | null
  /** Overall quality tier. */
  quality: 'Excellent' | 'Good' | 'Possible' | 'No effect'
  headline: string
  description: string
  /** T+ seconds when the plume first becomes illuminated. */
  best_window_start_sec: number | null
  /** T+ seconds when the rocket typically leaves easy view (~8 min). */
  best_window_end_sec: number | null
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
  twilight: TwilightPlumeInfo | null
}
