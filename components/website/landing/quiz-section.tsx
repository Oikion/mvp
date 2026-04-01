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
      // Header reveal
      gsap.fromTo(
        '.quiz-header > *',
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

      // Quiz card reveal
      gsap.fromTo(
        '.quiz-card-wrapper',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          delay: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.quiz-card-wrapper',
            start: 'top 85%',
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
      id="quiz"
      className="relative py-24 md:py-32 px-5 md:px-[52px] bg-[#262F27]"
      aria-labelledby="quiz-title"
    >
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="quiz-header mb-16 md:mb-20 text-center">
          <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#7B8C7C] mb-4">
            {t('quiz.sectionLabel')}
          </p>
          <h2
            id="quiz-title"
            className="text-[clamp(28px,3vw,44px)] font-light leading-[1.15] text-white tracking-[-0.01em] mb-5"
          >
            {t('quiz.sectionTitle')}
          </h2>
        </div>

        {/* Quiz card */}
        <div className="quiz-card-wrapper">
          <QuizCard />
        </div>
      </div>
    </section>
  )
}
