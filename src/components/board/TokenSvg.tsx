import type { TokenShape } from '../../utils/tokenShapes'

const VB = 32
const c = VB / 2
const r = VB / 2 - 1.5

function starPoints(cx: number, cy: number, ro: number, ri: number, n: number): string {
  return Array.from({ length: n }, (_, i) => {
    const outerA = (i * (360 / n) - 90) * Math.PI / 180
    const innerA = outerA + (180 / n) * Math.PI / 180
    return [
      `${cx + ro * Math.cos(outerA)},${cy + ro * Math.sin(outerA)}`,
      `${cx + ri * Math.cos(innerA)},${cy + ri * Math.sin(innerA)}`,
    ]
  }).flat().join(' ')
}

function hexPoints(cx: number, cy: number, ro: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 - 30) * Math.PI / 180
    return `${cx + ro * Math.cos(a)},${cy + ro * Math.sin(a)}`
  }).join(' ')
}

export function TokenSvg({
  color, shape, size, className, style,
}: {
  color: string
  shape: TokenShape
  size?: number
  className?: string
  style?: React.CSSProperties
}) {
  const svgProps = {
    viewBox: `0 0 ${VB} ${VB}`,
    className,
    style,
    ...(size !== undefined ? { width: size, height: size } : {}),
  }
  const sw = '1.5'

  if (shape === 'square') {
    return (
      <svg {...svgProps}>
        <rect x="2" y="2" width={VB - 4} height={VB - 4} rx="3" fill={color} stroke="#fff" strokeWidth={sw} />
      </svg>
    )
  }

  if (shape === 'diamond') {
    const points = `${c},2 ${VB - 2},${c} ${c},${VB - 2} 2,${c}`
    return (
      <svg {...svgProps}>
        <polygon points={points} fill={color} stroke="#fff" strokeWidth={sw} />
      </svg>
    )
  }

  if (shape === 'triangle') {
    const points = `${c},2 ${VB - 2},${VB - 2} 2,${VB - 2}`
    return (
      <svg {...svgProps}>
        <polygon points={points} fill={color} stroke="#fff" strokeWidth={sw} />
      </svg>
    )
  }

  if (shape === 'star') {
    return (
      <svg {...svgProps}>
        <polygon points={starPoints(c, c, r, r * 0.42, 5)} fill={color} stroke="#fff" strokeWidth={sw} />
      </svg>
    )
  }

  if (shape === 'hexagon') {
    return (
      <svg {...svgProps}>
        <polygon points={hexPoints(c, c, r)} fill={color} stroke="#fff" strokeWidth={sw} />
      </svg>
    )
  }

  // circle (default)
  return (
    <svg {...svgProps}>
      <circle cx={c} cy={c} r={r} fill={color} stroke="#fff" strokeWidth={sw} />
    </svg>
  )
}
