'use client'

import { useEffect, useRef, createContext, useContext, type ReactNode } from 'react'
import Lenis from 'lenis'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import gsap from 'gsap'

gsap.registerPlugin(ScrollTrigger)

const LenisContext = createContext<Lenis | null>(null)

export function useLenis() {
  return useContext(LenisContext)
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    // Respect reduced motion
    if (globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    })

    lenisRef.current = lenis

    // Connect Lenis to GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update)

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000)
    })
    gsap.ticker.lagSmoothing(0)

    // Handle anchor links — intercept clicks on [href^="#"]
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a[href^="#"], button[data-scroll-to]')
      if (!target) return

      const href = target.getAttribute('href') || target.getAttribute('data-scroll-to')
      if (!href?.startsWith('#')) return

      const el = document.getElementById(href.slice(1))
      if (!el) return

      e.preventDefault()
      lenis.scrollTo(el, {
        offset: -80,
        duration: 1.4,
      })

      // Accessibility — set focus after scroll
      el.setAttribute('tabindex', '-1')
      setTimeout(() => el.focus({ preventScroll: true }), 1500)
    }

    document.addEventListener('click', handleAnchorClick)

    return () => {
      document.removeEventListener('click', handleAnchorClick)
      gsap.ticker.remove(lenis.raf as unknown as gsap.TickerCallback)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  return (
    <LenisContext.Provider value={lenisRef.current}>
      {children}
    </LenisContext.Provider>
  )
}
