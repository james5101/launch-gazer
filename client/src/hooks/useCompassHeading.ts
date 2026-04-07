import { useCallback, useEffect, useRef, useState } from 'react'
import { angleDelta } from '@/lib/utils'

declare global {
  interface DeviceOrientationEvent {
    webkitCompassHeading?: number
  }
  interface DeviceOrientationEventConstructor {
    requestPermission?: () => Promise<'granted' | 'denied' | 'default'>
  }
}

interface UseCompassHeadingResult {
  /** Current compass heading in degrees (0-360, null when inactive/unsupported) */
  heading: number | null
  /** Whether the device has an orientation sensor */
  supported: boolean
  /** Whether heading is currently streaming */
  active: boolean
  /** iOS permission state: 'granted' | 'denied' | 'default' | null (non-iOS) */
  permissionState: string | null
  /** Call from a click handler to request permission (iOS) and start listening */
  start: () => Promise<void>
  /** Stop listening */
  stop: () => void
}

const EMA_FACTOR = 0.15

function needsPermission(): boolean {
  return typeof DeviceOrientationEvent !== 'undefined' &&
    typeof (DeviceOrientationEvent as unknown as DeviceOrientationEventConstructor).requestPermission === 'function'
}

function hasDeviceOrientation(): boolean {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
}

export function useCompassHeading(): UseCompassHeadingResult {
  const [heading, setHeading] = useState<number | null>(null)
  const [supported, setSupported] = useState(() => hasDeviceOrientation())
  const [active, setActive] = useState(false)
  const [permissionState, setPermissionState] = useState<string | null>(
    () => needsPermission() ? 'prompt' : null
  )

  const rawHeadingRef = useRef<number | null>(null)
  const smoothedRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const listenerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null)
  const eventNameRef = useRef<string>('deviceorientation')

  // rAF loop: reads rawHeadingRef, applies EMA, sets state once per frame
  const startRAFLoop = useCallback(() => {
    const tick = () => {
      const raw = rawHeadingRef.current
      if (raw !== null) {
        if (smoothedRef.current === null) {
          smoothedRef.current = raw
        } else {
          const delta = angleDelta(smoothedRef.current, raw)
          smoothedRef.current = ((smoothedRef.current + EMA_FACTOR * delta) % 360 + 360) % 360
        }
        setHeading(Math.round(smoothedRef.current * 10) / 10)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const stopRAFLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    // iOS: webkitCompassHeading is true-north heading directly
    if (e.webkitCompassHeading !== undefined && e.webkitCompassHeading !== null) {
      rawHeadingRef.current = e.webkitCompassHeading
      return
    }
    // Android absolute: alpha is degrees from true north (counterclockwise)
    if (e.alpha !== null && e.alpha !== undefined) {
      rawHeadingRef.current = (360 - e.alpha) % 360
    }
  }, [])

  const startListening = useCallback(() => {
    // Try deviceorientationabsolute first (Chrome Android — gives true north)
    let usingAbsolute = false

    const absoluteHandler = (e: Event) => {
      if (!usingAbsolute) {
        usingAbsolute = true
        eventNameRef.current = 'deviceorientationabsolute'
        // Remove the fallback listener if we got absolute
        window.removeEventListener('deviceorientation', handleOrientation as EventListener)
      }
      handleOrientation(e as DeviceOrientationEvent)
    }

    // Check if deviceorientationabsolute is supported (Chrome Android — true north)
    const supportsAbsolute = 'ondeviceorientationabsolute' in window
    if (supportsAbsolute) {
      window.addEventListener('deviceorientationabsolute', absoluteHandler)
      listenerRef.current = absoluteHandler as unknown as (e: DeviceOrientationEvent) => void

      // Also add regular as fallback, in case absolute never fires
      window.addEventListener('deviceorientation', handleOrientation as EventListener)

      // After 1 second, if absolute never fired, fall back to regular
      setTimeout(() => {
        if (!usingAbsolute) {
          window.removeEventListener('deviceorientationabsolute', absoluteHandler)
          eventNameRef.current = 'deviceorientation'
          listenerRef.current = handleOrientation
        }
      }, 1000)
    } else {
      window.addEventListener('deviceorientation', handleOrientation as EventListener)
      listenerRef.current = handleOrientation
      eventNameRef.current = 'deviceorientation'
    }

    startRAFLoop()
    setActive(true)
  }, [handleOrientation, startRAFLoop])

  const start = useCallback(async () => {
    // iOS permission flow
    if (needsPermission()) {
      try {
        const result = await (DeviceOrientationEvent as unknown as DeviceOrientationEventConstructor).requestPermission!()
        setPermissionState(result)
        if (result !== 'granted') {
          setSupported(false)
          return
        }
      } catch {
        setPermissionState('denied')
        setSupported(false)
        return
      }
    }

    startListening()
  }, [startListening])

  const stop = useCallback(() => {
    stopRAFLoop()

    if (listenerRef.current) {
      window.removeEventListener(eventNameRef.current, listenerRef.current as EventListener)
      // Also clean up the other event in case both were registered
      window.removeEventListener('deviceorientationabsolute', listenerRef.current as EventListener)
      window.removeEventListener('deviceorientation', listenerRef.current as EventListener)
      listenerRef.current = null
    }

    rawHeadingRef.current = null
    smoothedRef.current = null
    setHeading(null)
    setActive(false)
  }, [stopRAFLoop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return { heading, supported, active, permissionState, start, stop }
}
