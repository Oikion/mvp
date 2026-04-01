'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Check, RotateCcw } from 'lucide-react'
import gsap from 'gsap'
import posthog from 'posthog-js'

type ProfileKey = 'networker' | 'organizer' | 'strategist' | 'allRounder'

const PROFILE_KEYS: ProfileKey[] = ['networker', 'organizer', 'strategist', 'allRounder']
const TOTAL_QUESTIONS = 5

function computeResult(answers: ProfileKey[]): ProfileKey {
  const scores: Record<ProfileKey, number> = {
    networker: 0, organizer: 0, strategist: 0, allRounder: 0,
  }
  answers.forEach(a => scores[a]++)

  // Tiebreaker priority: networker > strategist > organizer > allRounder
  const priority: ProfileKey[] = ['networker', 'strategist', 'organizer', 'allRounder']
  return priority.reduce((best, key) =>
    scores[key] > scores[best] ? key : best
  , priority[0])
}

type Step = 'intro' | number | 'result'

export function QuizCard() {
  const [step, setStep] = useState<Step>('intro')
  const [answers, setAnswers] = useState<ProfileKey[]>([])
  const [result, setResult] = useState<ProfileKey | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('landing')
  const locale = useLocale()

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const animateTransition = useCallback((direction: 'forward' | 'backward', onComplete: () => void) => {
    if (prefersReducedMotion || !contentRef.current) {
      onComplete()
      return
    }

    const xOut = direction === 'forward' ? -40 : 40
    const xIn = direction === 'forward' ? 40 : -40

    gsap.to(contentRef.current, {
      x: xOut,
      opacity: 0,
      duration: 0.125,
      ease: 'power2.in',
      onComplete: () => {
        onComplete()
        gsap.fromTo(contentRef.current, { x: xIn, opacity: 0 }, {
          x: 0,
          opacity: 1,
          duration: 0.125,
          ease: 'power2.out',
        })
      },
    })
  }, [prefersReducedMotion])

  const handleStart = useCallback(() => {
    posthog.capture('quiz_started')
    animateTransition('forward', () => setStep(0))
  }, [animateTransition])

  const handleAnswer = useCallback((profile: ProfileKey) => {
    const newAnswers = [...answers, profile]
    setAnswers(newAnswers)

    const currentQuestion = step as number

    if (currentQuestion >= TOTAL_QUESTIONS - 1) {
      const resultProfile = computeResult(newAnswers)
      setResult(resultProfile)
      animateTransition('forward', () => setStep('result'))
      posthog.capture('quiz_completed', { profile: resultProfile })
    } else {
      animateTransition('forward', () => setStep(currentQuestion + 1))
    }
  }, [answers, step, animateTransition])

  const handleRetake = useCallback(() => {
    posthog.capture('quiz_retaken')
    setAnswers([])
    setResult(null)
    animateTransition('backward', () => setStep('intro'))
  }, [animateTransition])

  // Focus management: move focus to content on step change
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.focus({ preventScroll: true })
    }
  }, [step])

  // Render: Intro
  if (step === 'intro') {
    return (
      <div ref={cardRef} className="max-w-[640px] mx-auto">
        <div
          ref={contentRef}
          tabIndex={-1}
          className="text-center outline-none"
          aria-live="polite"
        >
          <p className="text-[15px] text-white/50 leading-[1.7] mb-8">
            {t('quiz.sectionSubtitle')}
          </p>
          <button
            onClick={handleStart}
            data-magnetic
            className="inline-flex items-center px-8 py-4 bg-[#7B8C7C] text-white rounded-[5px] text-[14px] font-semibold tracking-[0.02em] hover:bg-[#8a9d8b] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
          >
            {t('quiz.startButton')}
          </button>
        </div>
      </div>
    )
  }

  // Render: Question
  if (typeof step === 'number') {
    const questionIndex = step
    const progress = ((questionIndex + 1) / TOTAL_QUESTIONS) * 100
    const options = t.raw(`quiz.questions.${questionIndex}.options`) as Array<{
      text: string
      profile: ProfileKey
    }>

    return (
      <div ref={cardRef} className="max-w-[640px] mx-auto">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium tracking-[0.06em] uppercase text-white/40">
              {t('quiz.progressLabel', { current: questionIndex + 1, total: TOTAL_QUESTIONS })}
            </span>
          </div>
          <div className="w-full h-[3px] bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#7B8C7C] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={questionIndex + 1}
              aria-valuemin={1}
              aria-valuemax={TOTAL_QUESTIONS}
            />
          </div>
        </div>

        <div
          ref={contentRef}
          tabIndex={-1}
          className="outline-none"
          aria-live="polite"
        >
          {/* Question text */}
          <h3
            id={`quiz-question-${questionIndex}`}
            className="text-[clamp(20px,2.5vw,28px)] font-light text-white leading-[1.3] mb-8"
          >
            {t(`quiz.questions.${questionIndex}.text`)}
          </h3>

          {/* Option buttons */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
            role="group"
            aria-labelledby={`quiz-question-${questionIndex}`}
          >
            {options.map((option, i) => (
              <button
                key={`${questionIndex}-${i}`}
                onClick={() => handleAnswer(option.profile as ProfileKey)}
                className="
                  min-h-[72px] p-5 rounded-xl text-left
                  bg-white/[0.03] border border-white/[0.06]
                  text-[14px] text-white/70 leading-[1.5]
                  transition-all duration-200
                  hover:bg-white/[0.08] hover:border-[#7B8C7C]/30 hover:text-white/90
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]
                  active:scale-[0.98]
                "
              >
                {option.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Render: Result
  if (step === 'result' && result) {
    const profile = result
    const metrics = t.raw(`quiz.result.profiles.${profile}.metrics`) as Array<{
      label: string
      value: string
    }>
    const features = t.raw(`quiz.result.profiles.${profile}.features`) as string[]

    return (
      <div ref={cardRef} className="max-w-[700px] mx-auto">
        <div
          ref={contentRef}
          tabIndex={-1}
          className="outline-none"
          aria-live="polite"
        >
          {/* Result label */}
          <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#7B8C7C] mb-6 text-center">
            {t('quiz.result.label')}
          </p>

          {/* Profile title */}
          <div className="text-center mb-2">
            <h3 className="text-[clamp(28px,3vw,40px)] font-light text-white leading-[1.15] tracking-[-0.01em]">
              {t(`quiz.result.profiles.${profile}.title`)}
            </h3>
            <p className="text-[15px] text-white/30 mt-1">
              {t(`quiz.result.profiles.${profile}.titleAlt`)}
            </p>
          </div>

          {/* Tagline */}
          <p className="text-[16px] text-[#7B8C7C] italic text-center mb-6">
            &ldquo;{t(`quiz.result.profiles.${profile}.tagline`)}&rdquo;
          </p>

          {/* Description */}
          <p className="text-[14px] text-white/50 leading-[1.7] text-center max-w-[560px] mx-auto mb-10">
            {t(`quiz.result.profiles.${profile}.description`)}
          </p>

          {/* Metrics grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {metrics.map((metric, i) => (
              <div
                key={i}
                className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center"
              >
                <p className="text-[13px] text-white/80 leading-[1.5] mb-2">
                  {metric.value}
                </p>
                <p className="text-[10px] font-medium tracking-[0.06em] uppercase text-[#7B8C7C]/70">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>

          {/* Features */}
          <div className="mb-10">
            <h4 className="text-[12px] font-medium tracking-[0.06em] uppercase text-white/40 mb-4 text-center">
              {t('quiz.result.helpTitle')}
            </h4>
            <div className="flex flex-col gap-3 max-w-[440px] mx-auto">
              {features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-[#7B8C7C] mt-0.5 shrink-0" aria-hidden="true" />
                  <span className="text-[14px] text-white/60 leading-[1.5]">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4">
            <a
              href={`/${locale}/app/register`}
              data-magnetic
              className="inline-flex items-center px-8 py-4 bg-[#7B8C7C] text-white rounded-[5px] text-[14px] font-semibold tracking-[0.02em] hover:bg-[#8a9d8b] transition-colors duration-200 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
            >
              {t('quiz.result.cta')}
            </a>

            <button
              onClick={handleRetake}
              className="inline-flex items-center gap-2 text-[13px] text-white/40 hover:text-white/70 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              {t('quiz.result.retake')}
            </button>
          </div>

          {/* All profiles row */}
          <div className="flex items-center justify-center gap-6 mt-10 pt-8 border-t border-white/[0.06]">
            {PROFILE_KEYS.map(key => (
              <span
                key={key}
                className={`text-[11px] tracking-[0.04em] transition-colors duration-200 ${
                  key === profile
                    ? 'text-[#7B8C7C] font-medium'
                    : 'text-white/20'
                }`}
              >
                {t(`quiz.result.profiles.${key}.title`)}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return null
}
