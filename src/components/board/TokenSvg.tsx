import { EMOJI_CHAR, type TokenShape } from '../../utils/tokenShapes'

const VB = 32

export function TokenSvg({
  color, shape, size, className, style,
}: {
  color: string
  shape: TokenShape
  size?: number
  className?: string
  style?: React.CSSProperties
}) {
  const emoji = EMOJI_CHAR[shape] ?? '●'
  const c = VB / 2
  const r = VB / 2 - 1

  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      className={className}
      style={style}
      {...(size !== undefined ? { width: size, height: size } : {})}
    >
      <circle cx={c} cy={c} r={r} fill={color} stroke="#fff" strokeWidth="1.5" opacity="0.25" />
      <text x={c} y={c + 1} textAnchor="middle" dominantBaseline="middle" fontSize={VB * 0.7}>{emoji}</text>
    </svg>
  )
}
