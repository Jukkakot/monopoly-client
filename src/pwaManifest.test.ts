import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// Guards the installable-PWA setup: a malformed or unlinked manifest silently
// disables "add to home screen" with no build error. These assertions fail loudly.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

describe('PWA manifest', () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'public/manifest.webmanifest'), 'utf8'))

  it('declares the fields browsers require to offer installation', () => {
    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBeTruthy()
    expect(manifest.theme_color).toBe('#2e7d32')
  })

  it('ships 192 and 512 icons plus a maskable variant', () => {
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)
  })

  it('references icon files that actually exist', () => {
    for (const icon of manifest.icons as { src: string }[]) {
      expect(() => readFileSync(resolve(root, 'public', icon.src))).not.toThrow()
    }
  })

  it('is linked from index.html', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8')
    expect(html).toMatch(/<link[^>]+rel="manifest"/)
    expect(html).toMatch(/name="theme-color"/)
  })
})
