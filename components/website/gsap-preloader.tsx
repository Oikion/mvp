'use client'

import React, { useRef, useState, useEffect } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { CustomEase } from 'gsap/CustomEase'
import { Logo } from './logo'
import { cn } from '@/lib/utils'

// Register plugins
gsap.registerPlugin(CustomEase)

interface GSAPPreloaderProps {
  onComplete: () => void
}

const SplitTextWrapper = ({ children, className }: { children: string, className?: string }) => {
  return (
    <span className={cn("inline-block overflow-hidden", className)}>
      {children.split('').map((char, i) => (
        <span key={i} className="inline-block whitespace-pre opacity-0 translate-y-[125%] reveal-char">
          {char}
        </span>
      ))}
    </span>
  )
}

export const GSAPPreloader = ({ onComplete }: GSAPPreloaderProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(true)

  useGSAP(() => {
    // Create custom ease
    CustomEase.create("loader", "0.65, 0.01, 0.05, 0.99")

    const wrap = containerRef.current
    if (!wrap) return

    const container = wrap.querySelector("[data-load-container]")
    const bg = wrap.querySelector("[data-load-bg]")
    const progressBar = wrap.querySelector("[data-load-progress]")
    const logo = wrap.querySelector("[data-load-logo]")
    
    // Initial states
    gsap.set(wrap, { display: "block", autoAlpha: 1 })
    
    // Main loader timeline
    const loadTimeline = gsap.timeline({ 
      defaults: { 
        ease: "loader",
        duration: 3
      },
      onComplete: () => {
        setIsVisible(false)
        onComplete()
      }
    })
    
    loadTimeline
      .to(progressBar, { scaleX: 1 })
      .to(logo, { clipPath: "inset(0% 0% 0% 0%)" }, "<")
      .to(container, { autoAlpha: 0, duration: 0.5 })
      .to(progressBar, { scaleX: 0, transformOrigin: "right center", duration: 0.5 }, "<")
      .add("hideContent", "<")
      .to(bg, { yPercent: -101, duration: 1 }, "hideContent")

  }, { scope: containerRef })

  if (!isVisible) return null

  return (
    <div ref={containerRef} className="fixed inset-0 z-[100] w-full h-[100dvh] text-foreground opacity-0">
      <div data-load-bg className="absolute inset-0 w-full h-full bg-background">
        <div 
          data-load-progress 
          className="absolute inset-x-0 bottom-0 w-full h-2 bg-foreground origin-left transform scale-x-0 z-10"
        />
      </div>

      <div data-load-container className="relative z-20 w-full h-full flex flex-col justify-center items-center">
        <div className="relative w-48 h-12 flex justify-center items-center sm:w-64 sm:h-16">
          {/* Base Logo (Faded) */}
          <div className="absolute w-full opacity-20 text-foreground">
            <Logo size="xl" className="w-full h-auto" />
          </div>
          
          {/* Top Logo (Revealed via clip-path) */}
          <div 
            data-load-logo 
            className="absolute w-full text-foreground"
            style={{ clipPath: 'inset(0% 100% 0% 0%)' }}
          >
            <Logo size="xl" className="w-full h-auto" />
          </div>
        </div>
      </div>
    </div>
  )
}
