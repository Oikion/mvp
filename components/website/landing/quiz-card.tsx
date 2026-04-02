'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { ArrowRight, ArrowLeft, Check, RotateCcw } from 'lucide-react'
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

export function QuizCard() {
  // step 0 = intro, 1-5 = questions, 6 = result
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<ProfileKey[]>([])
  const [selectedOption, setSelectedOption] = useState<ProfileKey | null>(null)
  const [result, setResult] = useState<ProfileKey | null>(null)
  const stepContainerRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('landing')
  const locale = useLocale()

  const totalSteps = TOTAL_QUESTIONS + 1 // 1 intro + 5 questions (result is separate)

  const goTo = useCallback((nextStep: number) => {
    const container = stepContainerRef.current
    if (!container) { setStep(nextStep); return }

    const goingForward = nextStep > step

    gsap.to(container, {
      opacity: 0,
      y: goingForward ? -12 : 12,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        setStep(nextStep)
        gsap.set(container, { y: goingForward ? 12 : -12, opacity: 1 })
        gsap.to(container, { y: 0, duration: 0.3, ease: 'power2.out' })
      },
    })
  }, [step])

  const handleStart = useCallback(() => {
    posthog.capture('quiz_started')
    goTo(1)
  }, [goTo])

  const handleSelectOption = useCallback((profile: ProfileKey) => {
    setSelectedOption(profile)
  }, [])

  const handleNext = useCallback(() => {
    if (step >= 1 && step <= TOTAL_QUESTIONS && selectedOption) {
      const newAnswers = [...answers, selectedOption]
      setAnswers(newAnswers)
      setSelectedOption(null)

      if (step >= TOTAL_QUESTIONS) {
        // Last question — compute result
        const resultProfile = computeResult(newAnswers)
        setResult(resultProfile)
        goTo(TOTAL_QUESTIONS + 1)
        posthog.capture('quiz_completed', { profile: resultProfile })
      } else {
        goTo(step + 1)
      }
    }
  }, [step, selectedOption, answers, goTo])

  const handleBack = useCallback(() => {
    if (step > 1) {
      // Remove last answer when going back
      setAnswers(prev => prev.slice(0, -1))
      setSelectedOption(null)
      goTo(step - 1)
    }
  }, [step, goTo])

  const handleRetake = useCallback(() => {
    posthog.capture('quiz_retaken')
    setAnswers([])
    setSelectedOption(null)
    setResult(null)
    goTo(0)
  }, [goTo])

  // Focus management
  useEffect(() => {
    if (stepContainerRef.current) {
      stepContainerRef.current.focus({ preventScroll: true })
    }
  }, [step])

  const isResult = step === TOTAL_QUESTIONS + 1

  // Result screen — no card wrapper, different layout
  if (isResult && result) {
    const profile = result
    const metrics = t.raw(`quiz.result.profiles.${profile}.metrics`) as Array<{
      label: string
      value: string
    }>
    const features = t.raw(`quiz.result.profiles.${profile}.features`) as string[]

    return (
      <div className="bg-[#E8E2D9] rounded-2xl p-6 md:p-10 border border-[#d9d2c8]">
        <div
          ref={stepContainerRef}
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
            <h3 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 300, lineHeight: 1.15 }} className="text-[#262F27]">
              {t(`quiz.result.profiles.${profile}.title`)}
            </h3>
            <p className="text-[15px] text-[#262F27]/40 mt-1">
              {t(`quiz.result.profiles.${profile}.titleAlt`)}
            </p>
          </div>

          {/* Tagline */}
          <p className="text-[16px] text-[#7B8C7C] italic text-center mb-6">
            &ldquo;{t(`quiz.result.profiles.${profile}.tagline`)}&rdquo;
          </p>

          {/* Description */}
          <p className="text-[14px] text-[#262F27]/60 leading-[1.7] text-center max-w-[480px] mx-auto mb-10">
            {t(`quiz.result.profiles.${profile}.description`)}
          </p>

          {/* Metrics grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
            {metrics.map((metric, i) => (
              <div
                key={i}
                className="p-5 rounded-xl bg-[#E8E2D9] border border-[#d9d2c8] text-center"
              >
                <p className="text-[13px] text-[#262F27] leading-[1.5] mb-2">
                  {metric.value}
                </p>
                <p className="text-[10px] font-medium tracking-[0.06em] uppercase text-[#7B8C7C]">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>

          {/* Features */}
          <div className="mb-10">
            <h4 className="text-[12px] font-medium tracking-[0.06em] uppercase text-[#262F27]/40 mb-4 text-center">
              {t('quiz.result.helpTitle')}
            </h4>
            <div className="flex flex-col gap-3 max-w-[440px] mx-auto">
              {features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-[#7B8C7C] mt-0.5 shrink-0" aria-hidden="true" />
                  <span className="text-[14px] text-[#262F27]/70 leading-[1.5]">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mb-4">
            <a
              href={`/${locale}/app/register`}
              data-magnetic
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-[5px] bg-[#262F27] text-white text-[14px] font-semibold tracking-[0.02em] hover:bg-[#1a1f1b] transition-colors duration-200 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
            >
              {t('quiz.result.cta')}
            </a>
          </div>

          {/* Retake */}
          <div className="text-center">
            <button
              onClick={handleRetake}
              className="inline-flex items-center gap-2 text-[13px] text-[#262F27]/40 hover:text-[#262F27]/70 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              {t('quiz.result.retake')}
            </button>
          </div>

          {/* All profiles row */}
          <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-[#E8E2D9]">
            {PROFILE_KEYS.map(key => (
              <span
                key={key}
                className={`text-[11px] tracking-[0.04em] transition-colors duration-200 ${
                  key === profile
                    ? 'text-[#7B8C7C] font-bold'
                    : 'text-[#262F27]/50'
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

  // Intro + Questions — inside card matching contact wizard
  return (
    <div className="bg-[#E8E2D9] rounded-2xl p-6 md:p-10 border border-[#d9d2c8]">

      {/* Progress indicator — same as contact wizard */}
      {step >= 1 && (
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full flex-1 transition-colors duration-300"
              style={{ backgroundColor: i < step ? '#7B8C7C' : '#d9d2c8' }}
              aria-hidden="true"
            />
          ))}
          <span className="text-[11px] text-[#262F27]/40 ml-2 tabular-nums">
            {step}/{TOTAL_QUESTIONS}
          </span>
        </div>
      )}

      {/* Step content */}
      <div ref={stepContainerRef} tabIndex={-1} className="outline-none" aria-live="polite">

        {/* Step 0: Intro */}
        {step === 0 && (
          <div className="text-center py-6">
            <button
              onClick={handleStart}
              data-magnetic
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-[5px] bg-[#262F27] text-white text-[14px] font-semibold tracking-[0.02em] hover:bg-[#1a1f1b] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
            >
              {t('quiz.startButton')}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Steps 1-5: Questions */}
        {step >= 1 && step <= TOTAL_QUESTIONS && (() => {
          const questionIndex = step - 1
          const options = t.raw(`quiz.questions.${questionIndex}.options`) as Array<{
            text: string
            profile: ProfileKey
          }>

          return (
            <div>
              <h3 className="text-xl font-light text-[#262F27] mb-6">
                {t(`quiz.questions.${questionIndex}.text`)}
              </h3>

              {/* Option buttons — same grid style as contact wizard inquiry options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3" role="radiogroup" aria-label={t(`quiz.questions.${questionIndex}.text`)}>
                {options.map((option, i) => (
                  <button
                    key={`${questionIndex}-${i}`}
                    type="button"
                    role="radio"
                    aria-checked={selectedOption === option.profile}
                    onClick={() => handleSelectOption(option.profile as ProfileKey)}
                    className="p-4 rounded-xl border transition-all duration-200 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
                    style={{
                      backgroundColor: selectedOption === option.profile ? '#262F27' : '#E8E2D9',
                      borderColor: selectedOption === option.profile ? '#262F27' : '#d9d2c8',
                      color: selectedOption === option.profile ? '#fff' : '#262F27',
                    }}
                  >
                    <span className="text-[13px] font-medium leading-tight">
                      {option.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Navigation buttons — same as contact wizard */}
      {step >= 1 && step <= TOTAL_QUESTIONS && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#E8E2D9]">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#262F27]/50 hover:text-[#262F27] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              {t('quiz.back')}
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            data-magnetic
            disabled={!selectedOption}
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-[5px] bg-[#262F27] text-white text-[13px] font-semibold tracking-[0.02em] hover:bg-[#1a1f1b] transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
          >
            {t('quiz.next')}
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
