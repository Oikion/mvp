'use client'

import React, { useRef, useState, useMemo, createContext, useContext } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { CustomEase } from 'gsap/CustomEase'
import { Logo } from './logo'
import { cn } from '@/lib/utils'

// Register plugins
gsap.registerPlugin(CustomEase)

// ============================================
// Page Transition Context
// ============================================
interface PageTransitionContextType {
  isTransitioning: boolean
  startTransition: (callback?: () => void) => void
}

const PageTransitionContext = createContext<PageTransitionContextType>({
  isTransitioning: false,
  startTransition: () => {},
})

export const usePageTransition = () => useContext(PageTransitionContext)

// ============================================
// Page Transition Provider
// ============================================
interface PageTransitionProviderProps {
  children: React.ReactNode
}

export const PageTransitionProvider = ({ children }: PageTransitionProviderProps) => {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [callback, setCallback] = useState<(() => void) | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const startTransition = (cb?: () => void) => {
    setIsTransitioning(true)
    if (cb) setCallback(() => cb)
  }

  useGSAP(() => {
    if (!isTransitioning || !overlayRef.current) return

    CustomEase.create("transition", "0.65, 0.01, 0.05, 0.99")

    const overlay = overlayRef.current
    const bg = overlay.querySelector("[data-transition-bg]")
    const logo = overlay.querySelector("[data-transition-logo]")

    const tl = gsap.timeline({
      defaults: { ease: "transition" },
      onComplete: () => {
        // Execute callback (usually navigation)
        if (callback) {
          callback()
          setCallback(null)
        }
        // Animate out
        gsap.timeline({
          defaults: { ease: "transition" },
          onComplete: () => setIsTransitioning(false)
        })
          .to(logo, { opacity: 0, scale: 0.9, duration: 0.3 })
          .to(bg, { yPercent: -100, duration: 0.6 }, "-=0.1")
      }
    })

    gsap.set(bg, { yPercent: 100 })
    gsap.set(logo, { opacity: 0, scale: 0.9 })

    tl.to(bg, { yPercent: 0, duration: 0.6 })
      .to(logo, { opacity: 1, scale: 1, duration: 0.4 }, "-=0.3")

  }, { dependencies: [isTransitioning, callback] })

  const contextValue = useMemo(() => ({
    isTransitioning,
    startTransition
  }), [isTransitioning])

  return (
    <PageTransitionContext.Provider value={contextValue}>
      {children}
      
      {/* Transition Overlay */}
      {isTransitioning && (
        <div 
          ref={overlayRef} 
          className="fixed inset-0 z-[100] pointer-events-auto"
        >
          <div 
            data-transition-bg 
            className="absolute inset-0 w-full h-full bg-background"
          />
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <div 
              data-transition-logo 
              className="opacity-0"
            >
              <Logo size="xl" />
            </div>
          </div>
        </div>
      )}
    </PageTransitionContext.Provider>
  )
}

// ============================================
// Page Loader (Initial Load Animation)
// ============================================
interface PageLoaderProps {
  onComplete: () => void
  showLogo?: boolean
  minDuration?: number
}

export const PageLoader = ({ 
  onComplete, 
  showLogo = true,
  minDuration = 1.5 
}: PageLoaderProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(true)

  useGSAP(() => {
    CustomEase.create("loader", "0.65, 0.01, 0.05, 0.99")

    const wrap = containerRef.current
    if (!wrap) return

    const bg = wrap.querySelector("[data-loader-bg]")
    const logo = wrap.querySelector("[data-loader-logo]")
    const progress = wrap.querySelector("[data-loader-progress]")

    gsap.set(wrap, { autoAlpha: 1 })

    const tl = gsap.timeline({
      defaults: { ease: "loader" },
      onComplete: () => {
        setIsVisible(false)
        onComplete()
      }
    })

    tl.to(progress, { scaleX: 1, duration: minDuration })
      .to(logo, { opacity: 1, scale: 1, duration: 0.4 }, 0)
      .to(logo, { opacity: 0, scale: 0.95, duration: 0.3 }, `>-0.1`)
      .to(progress, { scaleX: 0, transformOrigin: "right center", duration: 0.4 }, "<")
      .to(bg, { yPercent: -100, duration: 0.6 }, "-=0.2")

  }, { scope: containerRef })

  if (!isVisible) return null

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-[100] w-full h-[100dvh] opacity-0"
    >
      <div 
        data-loader-bg 
        className="absolute inset-0 w-full h-full bg-background"
      >
        <div 
          data-loader-progress 
          className="absolute inset-x-0 bottom-0 w-full h-1 bg-primary origin-left scale-x-0"
        />
      </div>
      
      {showLogo && (
        <div className="relative z-10 w-full h-full flex items-center justify-center">
          <div 
            data-loader-logo 
            className="opacity-0 scale-95"
          >
            <Logo size="xl" />
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Page Content Transition (Fade In/Out)
// ============================================
interface PageContentProps {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
  stagger?: boolean
}

export const PageContent = ({ 
  children, 
  className,
  delay = 0,
  duration = 0.8,
  stagger = false
}: PageContentProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const container = containerRef.current
    if (!container) return

    if (stagger) {
      // Stagger children
      const elements = container.querySelectorAll('[data-animate]')
      gsap.fromTo(
        elements,
        { opacity: 0, y: 30 },
        { 
          opacity: 1, 
          y: 0, 
          duration,
          delay,
          stagger: 0.1,
          ease: "power3.out"
        }
      )
    } else {
      // Simple fade in
      gsap.fromTo(
        container,
        { opacity: 0, y: 20 },
        { 
          opacity: 1, 
          y: 0, 
          duration,
          delay,
          ease: "power3.out"
        }
      )
    }
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className={cn("opacity-0", className)}>
      {children}
    </div>
  )
}

// ============================================
// Smooth Link (with transition)
// ============================================
interface SmoothLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export const SmoothLink = ({ href, children, className, onClick }: SmoothLinkProps) => {
  const { startTransition } = usePageTransition()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onClick?.()
    startTransition(() => {
      globalThis.location.href = href
    })
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  )
}

// ============================================
// Preloader with Fade Out
// ============================================
interface PreloaderProps {
  onComplete: () => void
  duration?: number
}

export const Preloader = ({ onComplete, duration = 2.5 }: PreloaderProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(true)

  useGSAP(() => {
    CustomEase.create("preloader", "0.65, 0.01, 0.05, 0.99")

    const wrap = containerRef.current
    if (!wrap) return

    const bg = wrap.querySelector("[data-preloader-bg]")
    const logoBase = wrap.querySelector("[data-preloader-logo-base]")
    const logoReveal = wrap.querySelector("[data-preloader-logo-reveal]")
    const progress = wrap.querySelector("[data-preloader-progress]")

    gsap.set(wrap, { autoAlpha: 1 })

    const tl = gsap.timeline({
      defaults: { ease: "preloader" },
      onComplete: () => {
        setIsVisible(false)
        onComplete()
      }
    })

    // Loading animation
    tl.to(progress, { scaleX: 1, duration: duration })
      .to(logoReveal, { clipPath: "inset(0% 0% 0% 0%)", duration: duration }, 0)
      
    // Fade out animation
    tl.to([logoBase, logoReveal], { 
      opacity: 0, 
      scale: 0.95, 
      duration: 0.4,
      ease: "power2.in"
    })
      .to(progress, { 
        scaleX: 0, 
        transformOrigin: "right center", 
        duration: 0.4 
      }, "<")
      .to(bg, { 
        yPercent: -100, 
        duration: 0.7,
        ease: "power3.inOut"
      }, "-=0.2")

  }, { scope: containerRef })

  if (!isVisible) return null

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-[100] w-full h-[100dvh] opacity-0"
    >
      <div 
        data-preloader-bg 
        className="absolute inset-0 w-full h-full bg-background"
      >
        <div 
          data-preloader-progress 
          className="absolute inset-x-0 bottom-0 w-full h-1.5 bg-primary origin-left scale-x-0"
        />
      </div>
      
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <div className="relative w-48 h-12 sm:w-64 sm:h-16 flex justify-center items-center">
          {/* Base Logo (Faded) */}
          <div 
            data-preloader-logo-base
            className="absolute w-full opacity-20"
          >
            <Logo size="xl" className="w-full h-auto" />
          </div>
          
          {/* Reveal Logo (Clip-path animated) */}
          <div 
            data-preloader-logo-reveal
            className="absolute w-full"
            style={{ clipPath: 'inset(0% 100% 0% 0%)' }}
          >
            <Logo size="xl" className="w-full h-auto" />
          </div>
        </div>
      </div>
    </div>
  )
}
