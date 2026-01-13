'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Shield, Users, Bell } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { NewsletterForm } from './newsletter-form'

export const FinalCTASection = () => {
  const t = useTranslations('website')

  return (
    <section id="newsletter" className="py-16 md:py-20 lg:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-[160%] mb-4 sm:mb-6 text-foreground font-gallery">
            {t('finalCta.title').includes('Oikion') ? (
              <>
                {t('finalCta.title').split('Oikion')[0]}
                <span className="text-primary">Oikion</span>
                {t('finalCta.title').split('Oikion')[1]}
              </>
            ) : (
              t('finalCta.title')
            )}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 w-fit mx-auto leading-relaxed">
            {t('finalCta.subtitle')}
          </p>
          
          {/* Newsletter Benefits */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="flex items-center gap-1.5 sm:gap-2"
            >
              <div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 bg-primary/10 rounded-full flex items-center justify-center">
                <Bell className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
              </div>
              <span className="text-sm sm:text-base text-foreground font-medium">
                {t('finalCta.benefits.weeklyUpdates')}
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="flex items-center gap-1.5 sm:gap-2"
            >
              <div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
              </div>
              <span className="text-sm sm:text-base text-foreground font-medium">
                {t('finalCta.benefits.expertInsights')}
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="flex items-center gap-1.5 sm:gap-2"
            >
              <div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
              </div>
              <span className="text-sm sm:text-base text-foreground font-medium">
                {t('finalCta.benefits.noSpam')}
              </span>
            </motion.div>
          </div>

          <NewsletterForm formId="cta-newsletter" />

          {/* Privacy Notice */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            viewport={{ once: true }}
            className="text-xs sm:text-sm text-muted-foreground mt-4 sm:mt-6"
          >
            {t('finalCta.trustSignal')}
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}



