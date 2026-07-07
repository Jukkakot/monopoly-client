/**
 * Inline SVG flags for the language toggle. Self-contained — no external CDN
 * dependency, so the toggle can never render a broken image and works offline.
 */
export default function Flag({ country, size = 20, className }: {
  country: 'fi' | 'gb'
  size?: number
  className?: string
}) {
  const w = size
  const h = Math.round(size * 0.7)
  const common = { width: w, height: h, viewBox: '0 0 60 42', className, style: { display: 'block', borderRadius: 2 } as const }
  if (country === 'fi') {
    return (
      <svg {...common} aria-label="Suomi">
        <rect width="60" height="42" fill="#fff" />
        <rect y="15" width="60" height="12" fill="#003580" />
        <rect x="17" width="12" height="42" fill="#003580" />
      </svg>
    )
  }
  // Simplified but recognisable Union Jack.
  return (
    <svg {...common} aria-label="English">
      <rect width="60" height="42" fill="#012169" />
      <path d="M0 0 L60 42 M60 0 L0 42" stroke="#fff" strokeWidth="8" />
      <path d="M0 0 L60 42 M60 0 L0 42" stroke="#C8102E" strokeWidth="4" />
      <path d="M30 0 V42 M0 21 H60" stroke="#fff" strokeWidth="13" />
      <path d="M30 0 V42 M0 21 H60" stroke="#C8102E" strokeWidth="7" />
    </svg>
  )
}
