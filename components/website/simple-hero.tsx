'use client'

import React, { useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { SimpleNewsletterForm } from './simple-newsletter-form'

gsap.registerPlugin(useGSAP)

export const SimpleHero = ({ 
  startAnimation = false,
  onAnimationComplete 
}: { 
  startAnimation?: boolean;
  onAnimationComplete?: () => void;
}) => {
  const containerRef = useRef<HTMLElement>(null)
  const locale = useLocale()
  const t = useTranslations('website')
  
  const heroTitle = t('hero.title')
  const titleMaxWidthClass = locale === 'el' ? 'max-w-[20ch]' : 'max-w-[16ch]'

  useGSAP(() => {
    if (!startAnimation) return

    const tl = gsap.timeline({ 
      defaults: { ease: 'back.out(1.2)' },
      onComplete: onAnimationComplete
    })

    tl.to('.hero-element', {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 1.2,
      stagger: 0.15,
    })
  }, { scope: containerRef, dependencies: [startAnimation] })

  return (
    <section 
      ref={containerRef}
      className="relative w-screen h-[100dvh] flex flex-col items-center justify-center overflow-hidden bg-background"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center gap-6 md:gap-8 z-10">
        
        {/* Title */}
        <h1 className={`hero-element opacity-0 translate-y-20 scale-90 text-display font-gallery ${titleMaxWidthClass} text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[120%] tracking-tight text-foreground`}>
          {heroTitle}
        </h1>
        
        {/* Subtitle */}
        <p className="hero-element opacity-0 translate-y-20 scale-90 text-base sm:text-lg md:text-xl text-muted-foreground max-w-[55ch] mx-auto leading-relaxed">
          {t('hero.subtitle')}
        </p>

        {/* Newsletter Form */}
        <div className="hero-element opacity-0 translate-y-20 scale-90 w-full max-w-lg mx-auto mt-4">
          <SimpleNewsletterForm formId="hero-newsletter" />
        </div>
        
      </div>
    </section>
  )
}
