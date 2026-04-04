import { useState } from 'react'
import type { LaunchSummary } from '@/api/types'
import { StarField } from '@/components/StarField'
import { LaunchList } from '@/components/LaunchList'
import { SkyView } from '@/components/SkyView'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useDirection } from '@/hooks/useDirection'

type Screen = 'list' | 'loading' | 'direction'

export default function App() {
  const [screen, setScreen] = useState<Screen>('list')
  const [selectedLaunch, setSelectedLaunch] = useState<LaunchSummary | null>(null)

  const { lat, lon, loading: geoLoading, error: geoError, request: requestGeo } = useGeolocation()
  const { direction, loading: dirLoading, error: dirError } = useDirection(
    selectedLaunch?.id ?? null,
    lat,
    lon,
  )

  const handleSelectLaunch = (launch: LaunchSummary) => {
    setSelectedLaunch(launch)
    setScreen('loading')
    requestGeo()
  }

  const handleBack = () => {
    setScreen('list')
    setSelectedLaunch(null)
  }

  // Advance to direction screen once we have both location and direction data
  if (screen === 'loading' && direction && !dirLoading) {
    setScreen('direction')
  }

  const isWorking = screen === 'loading' && (geoLoading || dirLoading)
  const error = geoError ?? dirError

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <StarField />

      {/* Error toast */}
      {error && screen === 'loading' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-destructive/90 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg max-w-sm text-center">
          {error}
          <button onClick={handleBack} className="ml-3 underline opacity-75 hover:opacity-100">
            Back
          </button>
        </div>
      )}

      {/* Loading overlay */}
      {isWorking && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-4">
          <div className="relative w-16 h-16">
            <div className="w-16 h-16 rounded-full border border-accent/30 animate-ping absolute inset-0" />
            <div className="w-16 h-16 rounded-full border border-accent/60 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            </div>
          </div>
          <p className="text-xs text-accent tracking-[0.2em] uppercase font-mono animate-pulse">
            {geoLoading ? 'Acquiring position...' : 'Computing trajectory...'}
          </p>
        </div>
      )}

      {/* Screens */}
      <div
        className="transition-opacity duration-300"
        style={{ opacity: isWorking ? 0.2 : 1 }}
      >
        {screen === 'list' && <LaunchList onSelect={handleSelectLaunch} />}

        {screen === 'direction' && selectedLaunch && direction && (
          <SkyView launch={selectedLaunch} direction={direction} onBack={handleBack} />
        )}
      </div>
    </div>
  )
}
