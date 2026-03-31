'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const TEAM_MEMBERS = ['member1', 'member2', 'member3'] as const

export function TeamSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const t = useTranslations('landing')

  useGSAP(() => {
    const ctx = gsap.context(() => {
      // Header
      gsap.fromTo(
        '.team-header > *',
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

      // Team member cards
      gsap.fromTo(
        '.team-member',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.team-grid',
            start: 'top 80%',
            once: true,
          },
        }
      )

      // Philosophy quote
      gsap.fromTo(
        '.team-philosophy',
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.team-philosophy',
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
      id="team"
      className="relative py-24 md:py-32 px-5 md:px-[52px] bg-[#262F27]"
      aria-labelledby="team-title"
    >
      <div className="max-w-[1200px] mx-auto">

        {/* Header */}
        <div className="team-header mb-16 md:mb-20">
          <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#7B8C7C] mb-4">
            {t('team.label')}
          </p>
          <h2
            id="team-title"
            className="text-[clamp(28px,3vw,44px)] font-light leading-[1.15] text-white tracking-[-0.01em] mb-5 max-w-[500px]"
          >
            {t('team.title')}
          </h2>
          <p className="text-[15px] text-white/50 leading-[1.7] max-w-[460px]">
            {t('team.subtitle')}
          </p>
        </div>

        {/* Team members — philosophy-driven, no photos */}
        <div className="team-grid grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-16 md:mb-20">
          {TEAM_MEMBERS.map(memberId => (
            <article
              key={memberId}
              data-magnetic
              className="
                team-member group
                p-6 md:p-8 rounded-xl
                bg-white/[0.03] border border-white/[0.06]
                transition-all duration-300
                hover:bg-white/[0.06] hover:border-[#7B8C7C]/20
              "
            >
              {/* Monogram / initial */}
              <div className="w-14 h-14 rounded-full bg-[#7B8C7C]/15 flex items-center justify-center mb-6">
                <span className="text-xl font-light text-[#7B8C7C]">
                  {t(`team.members.${memberId}.initial`)}
                </span>
              </div>

              {/* Name + Role */}
              <h3 className="text-lg font-light text-white/90 mb-1">
                {t(`team.members.${memberId}.name`)}
              </h3>
              <p className="text-[11px] font-medium tracking-[0.06em] uppercase text-[#7B8C7C]/70 mb-4">
                {t(`team.members.${memberId}.role`)}
              </p>

              {/* Skills */}
              <div className="flex flex-wrap gap-2 mb-5">
                {(t.raw(`team.members.${memberId}.skills`) as string[]).map((skill: string) => (
                  <span
                    key={skill}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.05] text-white/40 tracking-wide"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {/* Philosophy statement */}
              <blockquote className="text-[13px] text-white/45 leading-relaxed italic border-l-2 border-[#7B8C7C]/20 pl-4">
                {t(`team.members.${memberId}.philosophy`)}
              </blockquote>
            </article>
          ))}
        </div>

        {/* Collective philosophy quote */}
        <div className="team-philosophy max-w-[700px] mx-auto text-center">
          <div className="w-12 h-px bg-[#7B8C7C]/30 mx-auto mb-8" aria-hidden="true" />
          <blockquote className="text-[clamp(18px,2vw,24px)] font-light text-white/70 leading-[1.5] italic">
            &ldquo;{t('team.quote')}&rdquo;
          </blockquote>
          <p className="mt-4 text-[12px] text-white/30 tracking-[0.06em] uppercase">
            {t('team.quoteAttribution')}
          </p>
        </div>
      </div>
    </section>
  )
}
