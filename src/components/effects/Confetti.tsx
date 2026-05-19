import { useEffect, useRef } from 'react'
import styles from './Confetti.module.css'

const COLORS = ['#e53935', '#1e88e5', '#43a047', '#f9a825', '#8e24aa', '#ff7043', '#00acc1']
const COUNT = 80

interface Particle {
  x: number; y: number; vx: number; vy: number
  color: string; rotation: number; rotSpeed: number
  w: number; h: number; opacity: number
}

export default function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas!.width,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.15,
      w: 8 + Math.random() * 8,
      h: 4 + Math.random() * 4,
      opacity: 0.85 + Math.random() * 0.15,
    }))

    function draw() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height)
      for (const p of particles) {
        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()

        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotSpeed
        p.vy += 0.05 // gravity
        p.opacity -= 0.003

        if (p.y > canvas!.height + 20 || p.opacity <= 0) {
          p.x = Math.random() * canvas!.width
          p.y = -20
          p.vy = 2 + Math.random() * 3
          p.opacity = 0.85 + Math.random() * 0.15
        }
      }
      rafRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className={styles.canvas} />
}
