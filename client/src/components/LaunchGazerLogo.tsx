import { useMemo } from 'react'

interface LaunchGazerLogoProps {
  size?: number
  className?: string
}

export function LaunchGazerLogo({ size = 100, className = '' }: LaunchGazerLogoProps) {
  // 36 tick marks at 10° intervals — only used on the rotating bearing ring
  const ticks = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const rad = ((i * 10 - 90) * Math.PI) / 180
        const isMajor = i % 9 === 0   // N / E / S / W
        const r1 = isMajor ? 37 : 41
        const r2 = 44
        return {
          x1: 50 + r1 * Math.cos(rad),
          y1: 50 + r1 * Math.sin(rad),
          x2: 50 + r2 * Math.cos(rad),
          y2: 50 + r2 * Math.sin(rad),
          isMajor,
        }
      }),
    []
  )

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LaunchGazer"
    >
      {/* CSS keyframe for the bearing ring spin */}
      <style>{`
        @keyframes launchgazer-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── ROTATING LAYER: outer bearing ring + ticks ── */}
      <g style={{ transformOrigin: '50px 50px', animation: 'launchgazer-spin 30s linear infinite' }}>
        {/* Outer bearing ring — cyan */}
        <circle cx="50" cy="50" r="44" stroke="rgba(0,229,255,0.55)" strokeWidth="1.25" />

        {/* Bearing ticks — major in cyan, minor in white */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1} y1={t.y1}
            x2={t.x2} y2={t.y2}
            stroke={t.isMajor ? 'rgba(0,229,255,0.85)' : 'rgba(255,255,255,0.28)'}
            strokeWidth={t.isMajor ? 1.5 : 0.85}
          />
        ))}
      </g>

      {/* ── STATIC LAYER: inner ring, crosshairs, centre pip ── */}
      <circle cx="50" cy="50" r="28" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />

      {/* Crosshairs — gap at centre */}
      <line x1="6"  y1="50" x2="43" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <line x1="57" y1="50" x2="94" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <line x1="50" y1="6"  x2="50" y2="43" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <line x1="50" y1="57" x2="50" y2="94" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />

      {/* Centre pip — observer position */}
      <circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.7)" />

      {/* ── TRAJECTORY + ROCKET (static) ── */}

      {/* Launch origin dot */}
      <circle cx="42" cy="72" r="2.8" fill="rgba(0,229,255,0.6)" />

      {/* Dashed trajectory arc */}
      <path
        d="M 42,72 C 36,55 52,32 68,20"
        stroke="rgba(0,229,255,0.55)"
        strokeWidth="1.6"
        strokeDasharray="3 2.5"
        strokeLinecap="round"
      />

      {/* Solid arc near rocket tip */}
      <path
        d="M 60,30 C 63,26 66,23 68,20"
        stroke="#00E5FF"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Rocket glow */}
      <circle cx="68" cy="20" r="10"  fill="rgba(0,229,255,0.1)"  />
      <circle cx="68" cy="20" r="6"   fill="rgba(0,229,255,0.22)" />

      {/* Rocket — rotated 34° so nose follows the trajectory tangent */}
      <g transform="translate(68,20) rotate(34)">
        <polygon points="0,-8.5 -3.8,0 3.8,0"              fill="#00E5FF" />
        <rect x="-2.6" y="0" width="5.2" height="6.5"      fill="#00E5FF" opacity="0.9" />
        <polygon points="-2.6,4 -6.5,9 -2.6,7"             fill="#00E5FF" opacity="0.75" />
        <polygon points="2.6,4 6.5,9 2.6,7"                fill="#00E5FF" opacity="0.75" />
        <ellipse cx="0" cy="10" rx="2.2" ry="3.5"          fill="rgba(0,229,255,0.4)" />
      </g>
    </svg>
  )
}
