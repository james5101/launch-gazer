import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useLaunch } from '@/hooks/useLaunch'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useDirection } from '@/hooks/useDirection'
import { SkyView } from './SkyView'
import { Countdown } from './Countdown'

type SubScreen = 'info' | 'loading' | 'direction'

export function LaunchDetailScreen() {
  const { launchId } = useParams<{ launchId: string }>()
  const location = useLocation()
  const autoStart = (location.state as { autoStart?: boolean } | null)?.autoStart === true

  const { launch, loading: launchLoading, error: launchError } = useLaunch(launchId)

  const { lat, lon, loading: geoLoading, error: geoError, request: requestGeo } = useGeolocation()
  const [viewingMode, setViewingMode] = useState(autoStart)

  // Only fetch direction once the user has opted in — pass null launchId until then
  const { direction, loading: dirLoading, error: dirError } = useDirection(
    viewingMode ? (launch?.id ?? null) : null,
    lat,
    lon,
  )

  // Determine current sub-screen
  const isWorking = viewingMode && (geoLoading || dirLoading)
  const hasDirection = viewingMode && direction && !dirLoading
  const error = geoError ?? dirError

  // Auto-trigger geolocation when navigating from the list
  useEffect(() => {
    if (autoStart) requestGeo()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart])

  const handleFindDirection = () => {
    setViewingMode(true)
    requestGeo()
  }

  const handleBackFromSkyView = () => {
    // Return to the launch info state without leaving the page
    setViewingMode(false)
  }

  // Determine which sub-screen to render
  let subScreen: SubScreen = 'info'
  if (viewingMode && hasDirection) {
    subScreen = 'direction'
  } else if (isWorking) {
    subScreen = 'loading'
  }

  // --- Direction screen ---
  if (subScreen === 'direction' && launch && direction) {
    return <SkyView launch={launch} direction={direction} onBack={handleBackFromSkyView} />
  }

  // --- Loading overlay ---
  if (subScreen === 'loading') {
    return (
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
    )
  }

  // --- Error state (geo or direction failed) ---
  if (error && viewingMode) {
    return (
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 py-12">
        <Link
          to="/"
          className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1.5 group mb-8"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">‹</span>
          All Launches
        </Link>
        <p className="text-destructive text-sm mb-4">{error}</p>
        <button
          onClick={() => setViewingMode(false)}
          className="text-sm text-accent underline"
        >
          Try again
        </button>
      </div>
    )
  }

  // --- Fetching launch data ---
  if (launchLoading) {
    return (
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 py-12">
        <div className="text-xs text-accent tracking-widest uppercase animate-pulse font-mono">
          Acquiring signal...
        </div>
      </div>
    )
  }

  // --- Launch not found ---
  if (launchError || !launch) {
    return (
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 py-12">
        <Link
          to="/"
          className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1.5 group mb-8"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">‹</span>
          All Launches
        </Link>
        <p className="text-muted-foreground text-sm">Launch not found.</p>
      </div>
    )
  }

  // --- Info screen ---
  return (
    <div className="relative z-10 w-full max-w-2xl mx-auto px-4 py-12">
      {/* Back to list */}
      <Link
        to="/"
        className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1.5 group mb-10"
      >
        <span className="group-hover:-translate-x-0.5 transition-transform">‹</span>
        All Launches
      </Link>

      {/* Mission header */}
      <div className="mb-2">
        <div className="text-[10px] text-accent tracking-[0.2em] uppercase font-mono mb-3">
          {launch.provider}
        </div>
        <h1 className="text-3xl font-bold tracking-tight leading-tight mb-3">
          {launch.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          {launch.rocket} &middot; {launch.pad.name}
        </p>
        <p className="text-muted-foreground text-sm">{launch.pad.location}</p>
      </div>

      {/* Countdown */}
      <div className="mt-4 mb-10">
        <Countdown scheduledAt={launch.scheduled_at} countdownSeconds={null} />
      </div>

      {/* Divider */}
      <div className="h-px bg-border mb-8" />

      {/* CTA */}
      <button
        onClick={handleFindDirection}
        className="inline-flex items-center gap-2 bg-accent text-black text-sm font-semibold px-5 py-2.5 rounded hover:bg-accent/90 transition-colors tracking-wide uppercase"
      >
        Find My Viewing Direction
        <span>›</span>
      </button>
    </div>
  )
}
