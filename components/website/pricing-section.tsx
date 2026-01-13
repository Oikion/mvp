'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { UserPlus, Building2, Crown, Sparkles, Check, Clock, Lock } from 'lucide-react'
import { Button } from '@/components/website/button'
import { useTranslations } from 'next-intl'
import useMobile from '@/hooks/use-mobile'

export const PricingSection = () => {
  const t = useTranslations('website')
  const { isMobile } = useMobile()

  const plans = [
    {
      id: 1,
      name: t('pricing.plans.starter.name'),
      description: t('pricing.plans.starter.description'),
      price: 29,
      period: t('pricing.perMonth'),
      icon: <UserPlus className="w-6 h-6" />,
      features: [
        t('pricing.plans.starter.features.0'),
        t('pricing.plans.starter.features.1'),
        t('pricing.plans.starter.features.2'),
        t('pricing.plans.starter.features.3'),
        t('pricing.plans.starter.features.4')
      ],
      popular: false,
      ctaText: t('pricing.plans.starter.ctaText'),
      disabled: true,
      comingSoon: true
    },
    {
      id: 2,
      name: t('pricing.plans.alpha.name'),
      description: t('pricing.plans.alpha.description'),
      price: null,
      period: null,
      icon: <Building2 className="w-6 h-6" />,
      features: [
        t('pricing.plans.alpha.features.0'),
        t('pricing.plans.alpha.features.1'),
        t('pricing.plans.alpha.features.2'),
        t('pricing.plans.alpha.features.3')
      ],
      popular: true,
      ctaText: t('pricing.plans.alpha.ctaText'),
      disabled: false,
      isAlpha: true
    },
    {
      id: 3,
      name: t('pricing.plans.enterprise.name'),
      description: t('pricing.plans.enterprise.description'),
      price: 149,
      period: t('pricing.perMonth'),
      icon: <Crown className="w-6 h-6" />,
      features: [
        t('pricing.plans.enterprise.features.0'),
        t('pricing.plans.enterprise.features.1'),
        t('pricing.plans.enterprise.features.2'),
        t('pricing.plans.enterprise.features.3'),
        t('pricing.plans.enterprise.features.4'),
        t('pricing.plans.enterprise.features.5'),
        t('pricing.plans.enterprise.features.6'),
        t('pricing.plans.enterprise.features.7')
      ],
      popular: false,
      ctaText: t('pricing.plans.enterprise.ctaText'),
      disabled: true,
      comingSoon: true
    }
  ]

  const displayedPlans = isMobile ? plans.filter(plan => plan.id === 2) : plans

  return (
    <section id="pricing" className="py-16 md:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-8 md:mb-12"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-[160%] mb-4 text-foreground font-gallery">
            {t('pricing.title')}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-[40ch] mx-auto leading-relaxed">
            {t('pricing.subtitle')}
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {displayedPlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.6, 
                delay: index * 0.1,
                ease: [0.21, 0.47, 0.32, 0.98]
              }}
              viewport={{ once: true }}
              className={`relative rounded-xl md:rounded-2xl transition-all duration-300 ${
                plan.disabled
                  ? 'opacity-50 brightness-75 cursor-not-allowed select-none blur-[15px]'
                  : plan.popular 
                    ? 'border-2 border-primary shadow-lg sm:scale-105 bg-gradient-to-br from-primary/5 to-primary/10' 
                    : 'border border-border hover:border-primary/20 hover:shadow-xl hover:-translate-y-1'
              } ${plan.popular && !isMobile && index === 1 ? 'sm:col-span-2 lg:col-span-1' : ''}`}
              aria-disabled={plan.disabled}
            >
              <div className={`px-4 pt-10 sm:pt-12 pb-0 rounded-xl md:rounded-2xl h-full ${plan.disabled ? 'bg-muted/20' : 'bg-card'}`}>
                {/* Coming Soon Badge */}
                {plan.disabled && plan.comingSoon && (
                  <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-muted text-muted-foreground px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 text-nowrap">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                      {t('pricing.comingSoon')}
                    </div>
                  </div>
                )}

                {/* Popular Badge */}
                {plan.popular && !plan.disabled && (
                  <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-primary text-primary-foreground px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 text-nowrap">
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                      {t('pricing.popularBadge')}
                    </div>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-4">
                  <div className={`inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl mb-3 sm:mb-4 ${
                    plan.isAlpha
                      ? 'bg-primary/20 text-primary'
                      : plan.disabled 
                        ? 'bg-muted/40 text-muted-foreground/70' 
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    <div className="w-5 h-5 sm:w-6 sm:h-6">
                      {plan.icon}
                    </div>
                  </div>
                  
                  {/* Price or Alpha Message */}
                  {plan.isAlpha ? (
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-primary mb-1 sm:mb-2">
                        {t('pricing.noPricingYet')}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {t('pricing.feedbackFirst')}
                      </p>
                    </div>
                  ) : plan.price ? (
                    <div className="flex items-end justify-center gap-1">
                      <span className="text-3xl sm:text-4xl font-bold text-foreground">
                        ${plan.price}
                      </span>
                      <span className="text-muted-foreground text-xs sm:text-sm pb-1">
                        /{plan.period}
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Plan Name & Description */}
                <div className="text-center mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{plan.description}</p>
                </div>

                {/* Features List */}
                <div className="space-y-3 sm:space-y-4 mb-10 sm:mb-12">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-2 sm:gap-3">
                      <div className={`flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center mt-0.5 ${
                        plan.isAlpha
                          ? 'bg-primary/20 text-primary'
                          : plan.disabled
                            ? 'bg-muted/40 text-muted-foreground/70'
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        <Check className="w-2 h-2 sm:w-3 sm:h-3" />
                      </div>
                      <span className="text-xs sm:text-sm text-foreground">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                {!plan.disabled ? (
                  <div className="pb-4 sm:pb-6">
                    <Button
                      size="lg"
                      variant={plan.popular ? 'default' : 'outline'}
                      className="w-full mt-auto"
                      onClick={() => {
                        const element = document.getElementById('newsletter')
                        if (element) {
                          const headerOffset = 80
                          const elementPosition = element.getBoundingClientRect().top
                          const offsetPosition = elementPosition + window.scrollY - headerOffset
                          window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
                        }
                      }}
                    >
                      {plan.popular 
                        ? t('navigation.registerPreAlpha')
                        : t('navigation.subscribeNewsletter')
                      }
                    </Button>
                  </div>
                ) : (
                  <div className="pb-4 sm:pb-6">
                    <div className="w-full h-10 sm:h-11 rounded-md bg-muted/40 border border-border/50 flex items-center justify-center text-muted-foreground/70 text-sm">
                      <Lock className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      {plan.ctaText}
                    </div>
                  </div>
                )}
              </div>

              {/* Overlay for disabled plans */}
              {plan.disabled && (
                <div 
                  className="absolute inset-0 bg-background/5 rounded-xl md:rounded-2xl pointer-events-none backdrop-blur-sm"
                  aria-hidden="true"
                ></div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Mobile additional text */}
        {isMobile && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-center text-sm text-muted-foreground mt-6"
          >
            Additional pricing plans will be available soon
          </motion.p>
        )}
      </div>
    </section>
  )
}



