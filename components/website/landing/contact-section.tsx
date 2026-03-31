'use client'

import { useRef, useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { submitWebsiteContactForm } from '@/actions/website/submit-contact-form'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import {
  TrendingUp,
  Handshake,
  Sparkles,
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  Send,
  CheckCircle2,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

gsap.registerPlugin(ScrollTrigger, useGSAP)

type InquiryType = 'invest' | 'partner' | 'try' | 'ask'

const INQUIRY_OPTIONS: { id: InquiryType; icon: typeof TrendingUp }[] = [
  { id: 'invest', icon: TrendingUp },
  { id: 'partner', icon: Handshake },
  { id: 'try', icon: Sparkles },
  { id: 'ask', icon: MessageCircle },
]

const TOTAL_STEPS = 4

const INPUT_CLASS =
  'w-full px-4 py-3.5 rounded-lg bg-[#E8E2D9] border border-[#E8E2D9] text-[14px] text-[#262F27] placeholder:text-[#262F27]/30 focus:outline-none focus:border-[#7B8C7C] focus:ring-1 focus:ring-[#7B8C7C]/30 transition-colors duration-200'

export function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const stepContainerRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(1)
  const [inquiryType, setInquiryType] = useState<InquiryType | null>(null)
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', email: '', orgName: '', message: '' })
  const updateField = (field: keyof typeof formData, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }))
  const t = useTranslations('landing')
  const locale = useLocale()

  // Section entrance animation
  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.contact-header > *',
        { y: 30, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.6, stagger: 0.12, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', once: true },
        }
      )
      gsap.fromTo(
        '.wizard-card',
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.6, ease: 'power3.out',
          scrollTrigger: { trigger: '.wizard-card', start: 'top 85%', once: true },
        }
      )
    }, sectionRef)
    return () => ctx.revert()
  }, { scope: sectionRef })

  const goTo = useCallback((nextStep: number) => {
    const container = stepContainerRef.current
    if (!container) { setStep(nextStep); return }

    const goingForward = nextStep > step

    // Exit: fade out + slide
    gsap.to(container, {
      opacity: 0,
      y: goingForward ? -12 : 12,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        setStep(nextStep)
        // Enter: slide in from opposite direction, fields visible immediately
        gsap.set(container, { y: goingForward ? 12 : -12, opacity: 1 })
        gsap.to(container, { y: 0, duration: 0.3, ease: 'power2.out' })
      },
    })
  }, [step])

  const handleSubmit = async () => {
    if (!inquiryType || !privacyConsent) return
    setSubmitting(true)
    setSubmitError(null)

    const result = await submitWebsiteContactForm({
      inquiryType,
      name: formData.name,
      email: formData.email,
      orgName: formData.orgName || undefined,
      message: formData.message || undefined,
      locale: locale as 'el' | 'en',
      privacyConsent: true,
    })

    setSubmitting(false)
    if (result.success) {
      setSubmitted(true)
    } else {
      setSubmitError(result.error ?? t('contact.wizard.submitError'))
    }
  }

  const canProceed = () => {
    if (step === 1) return inquiryType !== null
    return true // Steps 2 and 3 have required fields handled by the browser
  }

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="relative px-5 md:px-[52px] bg-[#F2EFE9]"
      style={{ paddingTop: '120px', paddingBottom: '120px' }}
      aria-labelledby="contact-title"
    >
      <div className="max-w-screen-md mx-auto">

        {/* Header */}
        <div className="contact-header text-center mb-10">
          <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#7B8C7C] mb-4">
            {t('contact.label')}
          </p>
          <h2
            id="contact-title"
            style={{ fontSize: 'clamp(28px, 3vw, 44px)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '-0.01em', textWrap: 'balance' as const }}
            className="text-[#262F27] mb-4"
          >
            {t('contact.title')}
          </h2>
          <p className="text-[15px] text-[#262F27]/50 leading-[1.7] max-w-[420px] mx-auto">
            {t('contact.subtitle')}
          </p>
        </div>

        {/* Wizard card */}
        <div className="wizard-card bg-[#E8E2D9]/50 rounded-2xl p-6 md:p-10 border border-[#E8E2D9]">

          {submitted ? (
            /* Success */
            <div className="text-center py-12" role="status" aria-live="polite">
              <div className="w-16 h-16 rounded-full bg-[#7B8C7C]/15 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-[#7B8C7C]" aria-hidden="true" />
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: 300 }} className="text-[#262F27] mb-3">
                {t('contact.success.title')}
              </h3>
              <p className="text-[15px] text-[#262F27]/50">
                {t('contact.success.body')}
              </p>
            </div>
          ) : (
            <>
              {/* Progress indicator */}
              <div className="flex items-center gap-2 mb-8">
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                  <div
                    key={i}
                    className="h-1 rounded-full flex-1 transition-colors duration-300"
                    style={{ backgroundColor: i < step ? '#7B8C7C' : '#d9d2c8' }}
                    aria-hidden="true"
                  />
                ))}
                <span className="text-[11px] text-[#262F27]/40 ml-2 tabular-nums">
                  {step}/{TOTAL_STEPS}
                </span>
              </div>

              {/* Step content */}
              <div ref={stepContainerRef}>

                {/* Step 1: Intent */}
                {step === 1 && (
                  <div>
                    <h3 className="step-field text-xl font-light text-[#262F27] mb-6">
                      {t('contact.wizard.step1Title')}
                    </h3>
                    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={t('contact.wizard.step1Title')}>
                      {INQUIRY_OPTIONS.map(({ id, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={inquiryType === id}
                          onClick={() => setInquiryType(id)}
                          className="step-field flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
                          style={{
                            backgroundColor: inquiryType === id ? '#262F27' : '#E8E2D9',
                            borderColor: inquiryType === id ? '#262F27' : '#d9d2c8',
                            color: inquiryType === id ? '#fff' : '#262F27',
                          }}
                        >
                          <Icon
                            className="w-5 h-5 flex-shrink-0"
                            style={{ color: inquiryType === id ? '#7B8C7C' : 'rgba(123,140,124,0.5)' }}
                            aria-hidden="true"
                          />
                          <span className="text-[13px] font-medium leading-tight">
                            {t(`contact.wizard.intents.${id}`)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: Who are you */}
                {step === 2 && (
                  <div>
                    <h3 className="step-field text-xl font-light text-[#262F27] mb-6">
                      {t('contact.wizard.step2Title')}
                    </h3>
                    <div className="space-y-4">
                      <div className="step-field">
                        <label htmlFor="w-name" className="block text-[12px] font-medium text-[#262F27]/60 mb-1.5">
                          {t('contact.fields.name')}
                        </label>
                        <input id="w-name" type="text" required autoComplete="name" className={INPUT_CLASS} placeholder={t('contact.fields.namePlaceholder')} value={formData.name} onChange={(e) => updateField('name', e.target.value)} />
                      </div>
                      <div className="step-field">
                        <label htmlFor="w-email" className="block text-[12px] font-medium text-[#262F27]/60 mb-1.5">
                          {t('contact.fields.email')}
                        </label>
                        <input id="w-email" type="email" required autoComplete="email" className={INPUT_CLASS} placeholder={t('contact.fields.emailPlaceholder')} value={formData.email} onChange={(e) => updateField('email', e.target.value)} />
                      </div>
                      {(inquiryType === 'invest' || inquiryType === 'partner') && (
                        <div className="step-field">
                          <label htmlFor="w-org" className="block text-[12px] font-medium text-[#262F27]/60 mb-1.5">
                            {t('contact.fields.orgName')}
                          </label>
                          <input id="w-org" type="text" autoComplete="organization" className={INPUT_CLASS} placeholder={t('contact.fields.orgPlaceholder')} value={formData.orgName} onChange={(e) => updateField('orgName', e.target.value)} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 3: Message */}
                {step === 3 && (
                  <div>
                    <h3 className="step-field text-xl font-light text-[#262F27] mb-2">
                      {t('contact.wizard.step3Title')}
                    </h3>
                    <p className="step-field text-[13px] text-[#262F27]/40 mb-6">
                      {t(`contact.wizard.step3Hint.${inquiryType}`)}
                    </p>
                    <div className="step-field">
                      <textarea
                        id="w-message"
                        rows={5}
                        className={`${INPUT_CLASS} resize-y`}
                        placeholder={t('contact.wizard.messagePlaceholder')}
                        value={formData.message}
                        onChange={(e) => updateField('message', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Step 4: Review, consent & Send */}
                {step === 4 && (
                  <div>
                    <h3 className="step-field text-xl font-light text-[#262F27] mb-3 text-center">
                      {t('contact.wizard.step4Title')}
                    </h3>
                    <p className="step-field text-[14px] text-[#262F27]/50 mb-8 max-w-[360px] mx-auto text-center">
                      {t('contact.wizard.step4Body')}
                    </p>

                    {/* Privacy consent checkbox — centered */}
                    <div className="step-field flex justify-center mb-6">
                      <label className="flex items-start gap-3 cursor-pointer max-w-[360px]">
                        <Checkbox
                          id="privacy-consent"
                          checked={privacyConsent}
                          onCheckedChange={(checked) => setPrivacyConsent(checked === true)}
                          className="mt-0.5"
                        />
                        <span className="text-[13px] text-[#262F27]/60 leading-relaxed">
                          {t.rich('contact.wizard.privacyLabel', {
                            privacy: (chunks) => (
                              <a href={`/${locale}/legal/privacy-policy`} target="_blank" rel="noopener noreferrer" className="text-[#7B8C7C] underline underline-offset-2 hover:text-[#262F27] transition-colors">
                                {chunks}
                              </a>
                            ),
                            terms: (chunks) => (
                              <a href={`/${locale}/legal/terms-of-service`} target="_blank" rel="noopener noreferrer" className="text-[#7B8C7C] underline underline-offset-2 hover:text-[#262F27] transition-colors">
                                {chunks}
                              </a>
                            ),
                          })}
                        </span>
                      </label>
                    </div>

                    {/* Error message */}
                    {submitError && (
                      <p className="text-[13px] text-red-600 mb-4 text-center" role="alert">
                        {submitError}
                      </p>
                    )}

                    {/* Submit button */}
                    <div className="step-field text-center">
                      <button
                        type="button"
                        data-magnetic
                        disabled={submitting || !privacyConsent}
                        onClick={handleSubmit}
                        className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-[5px] bg-[#262F27] text-white text-[14px] font-semibold tracking-[0.02em] hover:bg-[#1a1f1b] transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
                        aria-busy={submitting}
                      >
                        {submitting ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" aria-hidden="true" />
                        )}
                        {submitting ? t('contact.submitting') : t('contact.submit')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#E8E2D9]">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => goTo(step - 1)}
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#262F27]/50 hover:text-[#262F27] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    {t('contact.wizard.back')}
                  </button>
                ) : (
                  <div />
                )}

                {step < TOTAL_STEPS && (
                  <button
                    type="button"
                    data-magnetic
                    disabled={!canProceed()}
                    onClick={() => goTo(step + 1)}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-[5px] bg-[#262F27] text-white text-[13px] font-semibold tracking-[0.02em] hover:bg-[#1a1f1b] transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
                  >
                    {t('contact.wizard.next')}
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
