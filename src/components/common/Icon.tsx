import type { CSSProperties, ReactElement } from 'react'

/**
 * Minimal inline-SVG icon set for persistent UI chrome (sidebar section titles,
 * bottom nav). Strokes inherit `currentColor` so icons take the theme colour of
 * their context. Playful game emoji are intentionally kept elsewhere.
 */
export type IconName = 'people' | 'actions' | 'list' | 'board' | 'sound' | 'muted' | 'menu'

const PATHS: Record<IconName, ReactElement> = {
  people: (
    <>
      <circle cx="8.5" cy="8" r="3" />
      <path d="M3 19.5a5.5 5.5 0 0 1 11 0" />
      <path d="M16.4 5.2a3 3 0 0 1 0 5.6" />
      <path d="M15.6 14.5a5.5 5.5 0 0 1 4 5" />
    </>
  ),
  actions: <path d="M13 3 5 13.5h5.5L9.5 21 19 10.5h-5.5z" />,
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.6" cy="6" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="18" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  board: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M3.5 9.5h17M3.5 14.5h17M9.5 3.5v17M14.5 3.5v17" />
    </>
  ),
  sound: (
    <>
      <path d="M4 9v6h3.5L13 20V4L7.5 9z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M18.8 6a8 8 0 0 1 0 12" />
    </>
  ),
  muted: (
    <>
      <path d="M4 9v6h3.5L13 20V4L7.5 9z" />
      <path d="M17 9.5l4 5M21 9.5l-4 5" />
    </>
  ),
  menu: (
    <>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
}

export default function Icon({ name, size = 15, className, style, strokeWidth = 2 }: {
  name: IconName
  size?: number
  className?: string
  style?: CSSProperties
  strokeWidth?: number
}) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style} aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
