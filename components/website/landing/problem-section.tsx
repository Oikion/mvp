'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const PROBLEM_CARDS = [
  { id: 'fragmentation', num: '01' },
  { id: 'network', num: '02' },
  { id: 'information', num: '03' },
] as const

export function ProblemSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const t = useTranslations('landing')

  useGSAP(() => {
    const ctx = gsap.context(() => {
      // Section label + title
      gsap.fromTo(
        '.problem-header > *',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            once: true,
          },
        }
      )

      // Cards staggered
      gsap.fromTo(
        '.problem-card',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.problem-cards-grid',
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
      id="problem"
      className="relative py-24 md:py-32 px-5 md:px-[52px] bg-[#F2EFE9]"
      aria-labelledby="problem-title"
    >
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-16">

        {/* Left — Header */}
        <div className="problem-header">
          <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#7B8C7C] mb-4">
            {t('problem.label')}
          </p>
          <h2
            id="problem-title"
            className="text-[clamp(28px,3vw,44px)] font-light leading-[1.15] text-[#262F27] tracking-[-0.01em] mb-5"
          >
            {t('problem.title')}
          </h2>
          <p className="text-[15px] text-[#262F27]/60 leading-[1.7] max-w-[380px]">
            {t('problem.body')}
          </p>
        </div>

        {/* Right — Problem cards */}
        <div className="problem-cards-grid flex flex-col gap-4">
          {PROBLEM_CARDS.map(({ id, num }) => (
            <article
              key={id}
              data-spotlight
              className="
                problem-card group relative
                bg-[#E8E2D9] rounded-lg p-6 md:p-8
                overflow-hidden
                border border-[#E8E2D9]
                transition-shadow duration-300
                hover:shadow-md
              "
            >
              {/* Spotlight gradient overlay */}
              <div
                className="
                  pointer-events-none absolute inset-0 opacity-0
                  group-hover:opacity-100 transition-opacity duration-300
                "
                style={{
                  background: 'radial-gradient(300px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(123,140,124,0.08), transparent 60%)',
                }}
                aria-hidden="true"
              />

              <div className="relative z-[1]">
                <span className="text-[11px] font-medium tracking-[0.08em] text-[#7B8C7C] mb-3 block">
                  {num} · {t(`problem.cards.${id}.tag`)}
                </span>
                <h3 className="text-lg md:text-xl font-light text-[#262F27] mb-3 leading-snug">
                  {t(`problem.cards.${id}.title`)}
                </h3>
                <p className="text-[13px] text-[#262F27]/70 leading-relaxed">
                  {t(`problem.cards.${id}.body`)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
