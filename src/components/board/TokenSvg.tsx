import { EMOJI_CHAR, type TokenShape } from '../../utils/tokenShapes'

export function TokenSvg({ color, shape, size }: { color: string; shape: TokenShape; size: number }) {
  const emoji = EMOJI_CHAR[shape]
  const s = size
  const c = s / 2
  const r = s / 2 - 0.5

  if (emoji) {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <circle cx={c} cy={c} r={r} fill={color} stroke="#fff" strokeWidth="1" opacity="0.2" />
        <text x={c} y={c + 1} textAnchor="middle" dominantBaseline="middle" fontSize={s * 0.7}>{emoji}</text>
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
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <polygon points={points} fill={color} stroke="#fff" strokeWidth="0.8" />
      </svg>
    )
  }

  if (shape === 'square') {
    const pad = 0.8
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <rect x={pad} y={pad} width={s - pad * 2} height={s - pad * 2} rx="1.5" fill={color} stroke="#fff" strokeWidth="0.8" />
      </svg>
    )
  }

  if (shape === 'triangle') {
    const points = `${c},${0.8} ${s - 0.8},${s - 0.8} ${0.8},${s - 0.8}`
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <polygon points={points} fill={color} stroke="#fff" strokeWidth="0.8" />
      </svg>
    )
  }

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <circle cx={c} cy={c} r={r} fill={color} stroke="#fff" strokeWidth="1" />
    </svg>
  )
}
