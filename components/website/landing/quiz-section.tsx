'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { QuizCard } from './quiz-card'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export function QuizSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const t = useTranslations('landing')

  useGSAP(() => {
    if (globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.quiz-header > *',
        { y: 30, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.6, stagger: 0.12, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', once: true },
        }
      )
      gsap.fromTo(
        '.quiz-card-wrapper',
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.6, ease: 'power3.out',
          scrollTrigger: { trigger: '.quiz-card-wrapper', start: 'top 85%', once: true },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, { scope: sectionRef })

  return (
    <section
      ref={sectionRef}
      id="quiz"
      className="relative px-5 md:px-[52px] bg-[#262F27]"
      style={{ paddingTop: '120px', paddingBottom: '120px' }}
      aria-labelledby="quiz-title"
    >
      <div className="max-w-screen-md mx-auto">

        {/* Header — same pattern as contact-section */}
        <div className="quiz-header text-center mb-10">
          <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#7B8C7C] mb-4">
            {t('quiz.sectionLabel')}
          </p>
          <h2
            id="quiz-title"
            style={{ fontSize: 'clamp(28px, 3vw, 44px)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '-0.01em', textWrap: 'balance' as const }}
            className="text-white mb-4"
          >
            {t('quiz.sectionTitle')}
          </h2>
          <p className="text-[15px] text-white/50 leading-[1.7] max-w-[420px] mx-auto">
            {t('quiz.sectionSubtitle')}
          </p>
        </div>

        {/* Quiz card — same card style as contact wizard */}
        <div className="quiz-card-wrapper">
          <QuizCard />
        </div>
      </div>
    </section>
  )
}
