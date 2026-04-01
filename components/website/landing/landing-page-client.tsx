'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { GSAPPreloader } from '@/components/website/gsap-preloader'
import { SmoothScroll } from './smooth-scroll'
import { CustomCursor } from './custom-cursor'
import { LandingNav } from './landing-nav'
import { HeroSection } from './hero-section'

const ProblemSection = dynamic(
  () => import('./problem-section').then(m => m.ProblemSection),
  { ssr: true }
)
const SolutionSection = dynamic(
  () => import('./solution-section').then(m => m.SolutionSection),
  { ssr: true }
)
const HowItWorksSection = dynamic(
  () => import('./how-it-works-section').then(m => m.HowItWorksSection),
  { ssr: true }
)
const QuizSection = dynamic(
  () => import('./quiz-section').then(m => m.QuizSection),
  { ssr: true }
)
const TeamSection = dynamic(
  () => import('./team-section').then(m => m.TeamSection),
  { ssr: true }
)
const ContactSection = dynamic(
  () => import('./contact-section').then(m => m.ContactSection),
  { ssr: true }
)
const LandingFooter = dynamic(
  () => import('./landing-footer').then(m => m.LandingFooter),
  { ssr: true }
)

export function LandingPageClient() {
  const [preloaderDone, setPreloaderDone] = useState(false)

  return (
    <>
      <GSAPPreloader onComplete={() => setPreloaderDone(true)} />

      {preloaderDone && (
        <SmoothScroll>
          <CustomCursor />
          <LandingNav />

          <main className="landing-page">
            <HeroSection />
            <ProblemSection />
            <SolutionSection />
            <HowItWorksSection />
            <QuizSection />
            <TeamSection />
            <ContactSection />
          </main>

          <LandingFooter />
        </SmoothScroll>
      )}
    </>
  )
}
