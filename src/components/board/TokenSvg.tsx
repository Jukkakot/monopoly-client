import { EMOJI_CHAR, type TokenShape } from '../../utils/tokenShapes'

const VB = 32  // fixed internal coordinate space

export function TokenSvg({
  color, shape, size, className, style,
}: {
  color: string
  shape: TokenShape
  size?: number
  className?: string
  style?: React.CSSProperties
}) {
  const emoji = EMOJI_CHAR[shape]
  const c = VB / 2
  const r = VB / 2 - 1

  const svgProps = {
    viewBox: `0 0 ${VB} ${VB}`,
    className,
    style,
    ...(size !== undefined ? { width: size, height: size } : {}),
  }

  if (emoji) {
    return (
      <svg {...svgProps}>
        <circle cx={c} cy={c} r={r} fill={color} stroke="#fff" strokeWidth="1.5" opacity="0.25" />
        <text x={c} y={c + 1} textAnchor="middle" dominantBaseline="middle" fontSize={VB * 0.7}>{emoji}</text>
      </svg>
    )
  }

  if (shape === 'star') {
    const points = Array.from({ length: 5 }, (_, i) => {
      const outerA = (i * 72 - 90) * Math.PI / 180
      const innerA = outerA + 36 * Math.PI / 180
      const ro = r, ri = r * 0.45
      return [
        `${c + ro * Math.cos(outerA)},${c + ro * Math.sin(outerA)}`,
        `${c + ri * Math.cos(innerA)},${c + ri * Math.sin(innerA)}`,
      ]
    }).flat().join(' ')
    return (
      <svg {...svgProps}>
        <polygon points={points} fill={color} stroke="#fff" strokeWidth="1" />
      </svg>
    )
  }

  if (shape === 'square') {
    return (
      <svg {...svgProps}>
        <rect x="1.5" y="1.5" width={VB - 3} height={VB - 3} rx="3" fill={color} stroke="#fff" strokeWidth="1" />
      </svg>
    )
  }

  if (shape === 'triangle') {
    const points = `${c},1.5 ${VB - 1.5},${VB - 1.5} 1.5,${VB - 1.5}`
    return (
      <svg {...svgProps}>
        <polygon points={points} fill={color} stroke="#fff" strokeWidth="1" />
      </svg>
    )
  }

  return (
    <svg {...svgProps}>
      <circle cx={c} cy={c} r={r} fill={color} stroke="#fff" strokeWidth="1.5" />
    </svg>
  )
}
