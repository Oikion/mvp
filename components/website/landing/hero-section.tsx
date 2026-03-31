'use client'

import { useRef, useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

const HERO_VARIANTS = ['v1', 'v2', 'v3', 'v4'] as const

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const t = useTranslations('landing')

  // Pick a random headline variant on the client only (avoids hydration mismatch)
  const [variant, setVariant] = useState<typeof HERO_VARIANTS[number]>('v1')
  useEffect(() => {
    setVariant(HERO_VARIANTS[Math.floor(Math.random() * HERO_VARIANTS.length)])
  }, [])

  useGSAP(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        delay: 0.3,
      })

      // Beat 1: Eyebrow
      tl.fromTo(
        '.hero-eyebrow',
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5 },
        0
      )

      // Beat 2: Headline reveal
      tl.fromTo(
        '.hero-headline-line',
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        0.15
      )

      // Beat 3: Sub-paragraph + CTAs
      tl.fromTo(
        '.hero-reveal',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
        0.65
      )

      // Beat 4: Bottom strip
      tl.fromTo(
        '.hero-strip',
        { opacity: 0 },
        { opacity: 1, duration: 0.4 },
        0.95
      )
    }, sectionRef)

    return () => ctx.revert()
  }, { scope: sectionRef })

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative min-h-screen bg-[#262F27] overflow-hidden"
      aria-label={t('hero.ariaLabel')}
    >
      {/* Centered content */}
      <div className="relative z-[2] flex flex-col items-center justify-center text-center px-5 md:px-[52px] pt-[140px] md:pt-[160px] pb-[80px] min-h-[calc(100vh-56px)]">

        {/* Eyebrow */}
        <div className="hero-eyebrow flex items-center gap-[10px] mb-8 opacity-0">
          <span className="w-[6px] h-[6px] rounded-full bg-[#7B8C7C]" aria-hidden="true" />
          <span className="text-[11px] font-medium tracking-[0.06em] uppercase text-white/50">
            {t('hero.eyebrow')}
          </span>
        </div>

        {/* Hook headline — single flowing sentence with accent word */}
        <h1
          className="hero-headline-line mb-6 opacity-0 text-white"
          style={{
            fontSize: 'clamp(32px, 4.2vw, 52px)',
            fontWeight: 300,
            lineHeight: 1.18,
            letterSpacing: '-0.02em',
            maxWidth: '860px',
            textWrap: 'balance',
          }}
        >
          {t.rich(`hero.headlines.${variant}.text`, {
            accent: (chunks) => (
              <span style={{ color: '#7B8C7C' }}>{chunks}</span>
            ),
          })}
        </h1>

        {/* Source citation */}
        <p className="hero-reveal text-[11px] text-white/30 mb-6 opacity-0 tracking-wide">
          {t(`hero.headlines.${variant}.source`)}
        </p>

        {/* Brand reveal paragraph */}
        <p className="hero-reveal text-[15px] md:text-[16px] text-white/55 leading-[1.7] max-w-[520px] mb-8 opacity-0">
          {t('hero.subtext')}
        </p>

        {/* Dual CTAs */}
        <div className="hero-reveal flex flex-wrap justify-center gap-3 opacity-0">
          <a
            href="#contact"
            data-magnetic
            className="px-7 py-3 bg-[#7B8C7C] text-white rounded-[5px] text-[13px] font-semibold tracking-[0.02em] hover:bg-[#8a9d8b] transition-colors duration-200 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
          >
            {t('hero.ctaPrimary')}
          </a>
          <a
            href="#how-it-works"
            data-magnetic
            className="px-7 py-3 border border-white/15 text-white/70 rounded-[5px] text-[13px] font-medium hover:border-white/30 hover:text-white transition-all duration-200 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
          >
            {t('hero.ctaSecondary')}
          </a>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="hero-strip relative z-[2] flex items-center justify-center gap-5 px-5 md:px-[52px] py-4 border-t border-white/[0.06] opacity-0">
        <span className="text-[11px] text-white/35">{t('hero.builtFor')}</span>
        <span className="w-px h-3 bg-white/10" aria-hidden="true" />
        <span className="text-[11px] text-white/35">{t('hero.audience1')}</span>
        <span className="w-[3px] h-[3px] rounded-full bg-white/15" aria-hidden="true" />
        <span className="text-[11px] text-white/35">{t('hero.audience2')}</span>
        <span className="w-[3px] h-[3px] rounded-full bg-white/15" aria-hidden="true" />
        <span className="text-[11px] text-white/35">{t('hero.audience3')}</span>
      </div>
    </section>
  )
}
