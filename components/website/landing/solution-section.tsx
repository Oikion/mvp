'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Users, Search, Bell, Shield } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const FEATURES = [
  { id: 'network', icon: Users },
  { id: 'matchmaking', icon: Search },
  { id: 'alerts', icon: Bell },
  { id: 'privacy', icon: Shield },
] as const

export function SolutionSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const t = useTranslations('landing')

  useGSAP(() => {
    const ctx = gsap.context(() => {
      // Header reveal
      gsap.fromTo(
        '.solution-header > *',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            once: true,
          },
        }
      )

      // Feature cards staggered
      gsap.fromTo(
        '.solution-feature',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.solution-grid',
            start: 'top 80%',
            once: true,
          },
        }
      )

    }, sectionRef)

    return () => ctx.revert()
  }, { scope: sectionRef })

  return (
    <section
      ref={sectionRef}
      id="solution"
      className="relative py-24 md:py-32 px-5 md:px-[52px] bg-[#262F27]"
      aria-labelledby="solution-title"
    >
      <div className="max-w-[1200px] mx-auto">

        {/* Header */}
        <div className="solution-header text-center mb-16 md:mb-20">
          <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#7B8C7C] mb-4">
            {t('solution.label')}
          </p>
          <h2
            id="solution-title"
            className="text-[clamp(28px,3vw,44px)] font-light leading-[1.15] text-white tracking-[-0.01em] mb-5 max-w-[600px] mx-auto" /* fluid type: website-only, not product UI — CLAUDE.md exception */
          >
            {t('solution.title')}
          </h2>
          <p className="text-[15px] text-white/50 leading-[1.7] max-w-[500px] mx-auto">
            {t('solution.subtitle')}
          </p>
        </div>

        {/* Feature cards — 2x2 grid */}
        <div className="solution-grid grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16 md:mb-20">
          {FEATURES.map(({ id, icon: Icon }) => (
            <article
              key={id}
              data-spotlight
              className="
                solution-feature group relative
                bg-white/[0.04] rounded-lg p-6 md:p-8
                border border-white/[0.06]
                overflow-hidden
                transition-all duration-300
                hover:bg-white/[0.06] hover:border-white/[0.1]
              "
            >
              {/* Spotlight overlay */}
              <div
                className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'radial-gradient(250px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(123,140,124,0.1), transparent 60%)',
                }}
                aria-hidden="true"
              />

              <div className="relative z-[1]">
                <div className="w-10 h-10 rounded-lg bg-[#7B8C7C]/15 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-[#7B8C7C]" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-light text-white/90 mb-2">
                  {t(`solution.features.${id}.title`)}
                </h3>
                <p className="text-[13px] text-white/45 leading-relaxed">
                  {t(`solution.features.${id}.body`)}
                </p>
              </div>
            </article>
          ))}
        </div>

      </div>
    </section>
  )
}
