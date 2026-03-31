'use client'

import { useEffect, useRef, useCallback } from 'react'

const CURSOR_STYLES = `
@media (hover: hover) and (pointer: fine) {
  body { cursor: none !important; }
  a, button, input, textarea, select, label,
  [role="button"], [data-magnetic] { cursor: none !important; }
  /* Prevent CSS transitions from fighting JS-driven magnetic transforms */
  [data-magnetic] { transition-property: color, background-color, border-color, opacity, box-shadow !important; }
}
@media (hover: none), (pointer: coarse) {
  .oikion-cursor-dot, .oikion-cursor-ring {
    display: none !important;
  }
  a, button, input, textarea, select, label,
  [role="button"], [data-magnetic] { cursor: pointer !important; }
}
`

// Magnetic element tracking — one entry per [data-magnetic] element
interface MagneticState {
  el: HTMLElement
  strength: number
  targetX: number
  targetY: number
  currentX: number
  currentY: number
  active: boolean
}

// Default values — can be overridden per-element via data-magnetic-strength
const DEFAULT_STRENGTH = 0.25
const MAGNETIC_LERP_IN = 0.15
const MAGNETIC_LERP_OUT = 0.1
// Max pixel offset — clamps large elements so they don't fly off
const MAX_OFFSET = 12

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const mouse = useRef({ x: 0, y: 0 })
  const ringPos = useRef({ x: 0, y: 0 })
  const rafId = useRef<number>(0)

  // Track bound elements to prevent duplicate listeners
  const boundElements = useRef(new WeakSet<HTMLElement>())
  const boundSpotlights = useRef(new WeakSet<HTMLElement>())
  const magneticElements = useRef<MagneticState[]>([])
  const boundMagnetics = useRef(new WeakSet<HTMLElement>())

  // Track dark/light state
  const onDarkBg = useRef(false)
  const darkCheckTimer = useRef(0)
  // Cache dark section rects — recalculated on scroll, not every frame
  const darkRects = useRef<DOMRect[]>([])

  const cacheDarkRects = useCallback(() => {
    const darkSections = document.querySelectorAll<HTMLElement>(
      '#hero, #solution, #team, footer, [data-cursor-dark]'
    )
    darkRects.current = Array.from(darkSections).map(el => el.getBoundingClientRect())
  }, [])

  const tick = useCallback(() => {
    const mx = mouse.current.x
    const my = mouse.current.y

    // Ring follower — higher lerp factor for snappier tracking
    ringPos.current.x += (mx - ringPos.current.x) * 0.18
    ringPos.current.y += (my - ringPos.current.y) * 0.18

    if (ringRef.current) {
      ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0) translate(-50%, -50%)`
    }

    // Dark/light check — uses cached rects, simple point-in-rect test (zero DOM queries)
    const now = performance.now()
    if (now - darkCheckTimer.current > 100 && dotRef.current && ringRef.current) {
      darkCheckTimer.current = now
      const isDark = darkRects.current.some(
        r => mx >= r.left && mx <= r.right && my >= r.top && my <= r.bottom
      )
      if (isDark !== onDarkBg.current) {
        onDarkBg.current = isDark
        dotRef.current.classList.toggle('cursor-on-dark', isDark)
        ringRef.current.classList.toggle('cursor-on-dark', isDark)
      }
    }

    // Magnetic elements — lerp each toward target or back to center
    for (const mag of magneticElements.current) {
      if (mag.active) {
        const rect = mag.el.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        let tx = (mouse.current.x - centerX) * mag.strength
        let ty = (mouse.current.y - centerY) * mag.strength

        // Clamp to max offset so large elements don't over-travel
        const dist = Math.hypot(tx, ty)
        if (dist > MAX_OFFSET) {
          const scale = MAX_OFFSET / dist
          tx *= scale
          ty *= scale
        }

        mag.targetX = tx
        mag.targetY = ty
        mag.currentX += (mag.targetX - mag.currentX) * MAGNETIC_LERP_IN
        mag.currentY += (mag.targetY - mag.currentY) * MAGNETIC_LERP_IN
      } else {
        // Return to center
        mag.targetX = 0
        mag.targetY = 0
        mag.currentX += (0 - mag.currentX) * MAGNETIC_LERP_OUT
        mag.currentY += (0 - mag.currentY) * MAGNETIC_LERP_OUT

        // Snap to zero when close enough to avoid sub-pixel jitter
        if (Math.abs(mag.currentX) < 0.1 && Math.abs(mag.currentY) < 0.1) {
          mag.currentX = 0
          mag.currentY = 0
        }
      }

      mag.el.style.transform = `translate(${mag.currentX}px, ${mag.currentY}px)`
    }

    rafId.current = requestAnimationFrame(tick)
  }, [cacheDarkRects])

  useEffect(() => {
    const dot = dotRef.current
    const ringEl = ringRef.current
    if (!dot || !ringEl) return

    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY
      dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`
    }

    const addHover = () => {
      dot.classList.add('cursor-hover')
      ringEl.classList.add('ring-hover')
    }
    const removeHover = () => {
      dot.classList.remove('cursor-hover')
      ringEl.classList.remove('ring-hover')
    }

    const bindInteractiveElements = () => {
      document.querySelectorAll<HTMLElement>(
        'a, button, [role="button"], input, textarea, select, label, .cursor-hover-target'
      ).forEach(el => {
        if (boundElements.current.has(el)) return
        boundElements.current.add(el)
        el.addEventListener('mouseenter', addHover)
        el.addEventListener('mouseleave', removeHover)
      })
    }

    const bindSpotlightCards = () => {
      document.querySelectorAll<HTMLElement>('[data-spotlight]').forEach(card => {
        if (boundSpotlights.current.has(card)) return
        boundSpotlights.current.add(card)
        card.addEventListener('mousemove', (e: MouseEvent) => {
          const rect = card.getBoundingClientRect()
          card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
          card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
        })
      })
    }

    const bindMagneticButtons = () => {
      document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach(btn => {
        if (boundMagnetics.current.has(btn)) return
        boundMagnetics.current.add(btn)

        const customStrength = btn.dataset.magneticStrength
        const state: MagneticState = {
          el: btn,
          strength: customStrength ? Number.parseFloat(customStrength) : DEFAULT_STRENGTH,
          targetX: 0,
          targetY: 0,
          currentX: 0,
          currentY: 0,
          active: false,
        }
        magneticElements.current.push(state)

        btn.addEventListener('mouseenter', () => {
          state.active = true
        })
        btn.addEventListener('mouseleave', () => {
          state.active = false
        })
      })
    }

    document.addEventListener('mousemove', onMouseMove)
    rafId.current = requestAnimationFrame(tick)

    // Cache dark section rects for cursor color detection
    cacheDarkRects()
    globalThis.addEventListener('scroll', cacheDarkRects, { passive: true })
    globalThis.addEventListener('resize', cacheDarkRects, { passive: true })

    requestAnimationFrame(() => {
      bindInteractiveElements()
      bindSpotlightCards()
      bindMagneticButtons()
      cacheDarkRects()
    })

    // Re-bind only new elements on DOM changes
    const observer = new MutationObserver(() => {
      bindInteractiveElements()
      bindSpotlightCards()
      bindMagneticButtons()
      cacheDarkRects()
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      globalThis.removeEventListener('scroll', cacheDarkRects)
      globalThis.removeEventListener('resize', cacheDarkRects)
      cancelAnimationFrame(rafId.current)
      observer.disconnect()
      for (const mag of magneticElements.current) {
        mag.el.style.transform = ''
      }
      magneticElements.current = []
    }
  }, [tick, cacheDarkRects])

  return (
    <>
      <style>{CURSOR_STYLES}</style>
      <div
        ref={dotRef}
        aria-hidden="true"
        className="oikion-cursor-dot pointer-events-none fixed top-0 left-0 z-[9999] h-2 w-2 rounded-full bg-[#7B8C7C] transition-[width,height,background,opacity] duration-200 ease-out [&.cursor-hover]:h-10 [&.cursor-hover]:w-10 [&.cursor-hover]:opacity-30 [&.cursor-on-dark]:bg-white will-change-transform"
      />
      <div
        ref={ringRef}
        aria-hidden="true"
        className="oikion-cursor-ring pointer-events-none fixed top-0 left-0 z-[9998] h-9 w-9 rounded-full border border-[#7B8C7C] opacity-50 transition-[width,height,opacity,border-color] duration-200 ease-out [&.ring-hover]:h-2 [&.ring-hover]:w-2 [&.ring-hover]:opacity-0 [&.cursor-on-dark]:border-white/60 will-change-transform"
      />
    </>
  )
}
