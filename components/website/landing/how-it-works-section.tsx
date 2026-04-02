'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { UserPlus, Building2, GitBranch, Handshake } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const STEPS = [
  { id: 'profile', num: '01', icon: UserPlus },
  { id: 'listings', num: '02', icon: Building2 },
  { id: 'match', num: '03', icon: GitBranch },
  { id: 'close', num: '04', icon: Handshake },
] as const

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const t = useTranslations('landing')

  useGSAP(() => {
    if (globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const section = sectionRef.current
    if (!section) return

    const ctx = gsap.context(() => {
      // Header reveal
      gsap.fromTo(
        '.hiw-header > *',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 75%',
            once: true,
          },
        }
      )

      // Cards reveal on scroll
      gsap.fromTo(
        '.hiw-step',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.hiw-cards',
            start: 'top 80%',
            once: true,
          },
        }
      )

      // Progress line grows through the cards
      gsap.fromTo(
        '.hiw-progress-line',
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: '.hiw-cards',
            start: 'top 60%',
            end: 'bottom 40%',
            scrub: 0.5,
          },
        }
      )

    }, section)

    // Step number fill — detect when card is stuck (rect.top === CSS top)
    // Using a scroll listener because ScrollTrigger can't detect sticky state
    const STICKY_TOP = 100 // matches style={{ top: '100px' }}
    const THRESHOLD = 30 // fill slightly before reaching stuck position

    const onScroll = () => {
      const steps = section.querySelectorAll<HTMLElement>('.hiw-step')
      steps.forEach((step) => {
        const num = step.querySelector('.hiw-num')
        if (!num) return
        const rect = step.getBoundingClientRect()
        // Card is stuck or about to stick
        const isStuck = rect.top <= STICKY_TOP + THRESHOLD
        num.classList.toggle('hiw-num-active', isStuck)
      })
    }

    globalThis.addEventListener('scroll', onScroll, { passive: true })
    // Also run once after layout settles
    setTimeout(onScroll, 600)

    return () => {
      ctx.revert()
      globalThis.removeEventListener('scroll', onScroll)
    }
  }, { scope: sectionRef })

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative bg-[#F2EFE9]" style={{ paddingTop: '160px', paddingBottom: '80px' }}
      aria-labelledby="how-title"
    >
      <style>{`
        .hiw-grid { display: grid; grid-template-columns: 1fr; gap: 48px; }
        @media (min-width: 768px) {
          .hiw-grid { grid-template-columns: 2fr 3fr; gap: 80px; }
        }
        .hiw-num { transition: color 0.35s ease; }
        .hiw-num-active { color: #262F27 !important; }
      `}</style>
      <div className="max-w-[1200px] mx-auto px-5 md:px-[52px]">
        <div className="hiw-grid">

          {/* Left — Sticky header */}
          <div className="hiw-header" style={{ position: 'sticky', top: '120px', alignSelf: 'start' }}>
            <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#7B8C7C] mb-4">
              {t('howItWorks.label')}
            </p>
            <h2
              id="how-title"
              className="text-[clamp(28px,3vw,44px)] font-light leading-[1.15] text-[#262F27] tracking-[-0.01em] mb-5"
            >
              {t('howItWorks.title')}
            </h2>
            <p className="text-[15px] text-[#262F27]/50 leading-[1.7] max-w-[320px]">
              {t('howItWorks.subtitle')}
            </p>

            {/* Progress line — visible on desktop alongside sticky header */}
            <div className="hidden md:block relative mt-10 h-[200px]">
              <div className="absolute left-0 top-0 w-px h-full bg-[#E8E2D9]" />
              <div
                className="hiw-progress-line absolute left-0 top-0 w-px h-full bg-[#7B8C7C] origin-top"
                style={{ transform: 'scaleY(0)' }}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Right — Stacking cards with proper gaps + extra height for sticky stacking */}
          <div className="hiw-cards flex flex-col gap-6 md:gap-8" style={{ paddingBottom: '40vh' }}>
            {STEPS.map(({ id, num, icon: Icon }, index) => (
              <div
                key={id}
                className="hiw-step sticky"
                style={{ top: '100px', zIndex: index + 1 }}
              >
                <div className="bg-[#E8E2D9] rounded-xl p-6 md:p-8 border border-[#E8E2D9] shadow-sm hover:shadow-md transition-shadow duration-300">
                  {/* Step number + icon */}
                  <div className="flex items-center justify-between mb-5">
                    <span className="hiw-num" style={{ fontSize: '48px', fontWeight: 900, color: '#d9d2c8', lineHeight: 1 }}>
                      {num}
                    </span>
                    <div className="w-10 h-10 rounded-lg bg-[#7B8C7C]/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#7B8C7C]" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-light text-[#262F27] mb-3 leading-snug">
                    {t(`howItWorks.steps.${id}.title`)}
                  </h3>
                  <p className="text-[13px] text-[#262F27]/60 leading-relaxed">
                    {t(`howItWorks.steps.${id}.body`)}
                  </p>

                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
