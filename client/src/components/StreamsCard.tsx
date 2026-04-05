import { useState } from 'react'
import type { StreamURL } from '@/api/types'
import { cn } from '@/lib/utils'

interface StreamsCardProps {
  streams: StreamURL[]
  webcastLive: boolean
}

function StreamThumbnail({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className="w-16 h-10 flex-shrink-0 rounded bg-white/[0.05] border border-border/30 flex items-center justify-center">
        <span className="text-muted-foreground text-[10px] font-mono">▶</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-16 h-10 flex-shrink-0 rounded object-cover border border-border/30"
    />
  )
}

export function StreamsCard({ streams, webcastLive }: StreamsCardProps) {
  return (
    <div className="mt-6 border border-border/50 rounded-lg p-4 bg-white/[0.02]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
          Watch Live
        </span>
        {webcastLive && (
          <span
            className={cn(
              'text-xs font-semibold px-2.5 py-0.5 rounded-full border animate-pulse',
              'text-accent border-accent/40 bg-accent/10',
            )}
          >
            ● LIVE
          </span>
        )}
      </div>

      {streams.length === 0 ? (
        /* Empty state */
        <p className="text-xs text-muted-foreground leading-relaxed">
          Streams typically become available closer to launch.
        </p>
      ) : (
        /* Stream list */
        <div className="flex flex-col gap-2">
          {streams.map((stream) => (
            <a
              key={stream.url}
              href={stream.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 border border-border/50 rounded-lg p-3 bg-white/[0.02] hover:bg-white/[0.05] transition-colors group"
            >
              <StreamThumbnail src={stream.feature_image} alt={stream.title || 'Stream thumbnail'} />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug truncate">
                  {stream.title || 'Watch Stream'}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] mt-0.5 font-mono">
                  {stream.type_name}
                </p>
              </div>

              <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm flex-shrink-0">
                ›
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
