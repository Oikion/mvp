'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { Button } from '@/components/website/button'
import { useTranslations, useLocale } from 'next-intl'

export const FAQSection = () => {
  const [openItems, setOpenItems] = useState<number[]>([])
  const locale = useLocale()
  const t = useTranslations('website')

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  // Access FAQ questions from translations
  const questions = [
    { id: 1, question: t('faq.questions.0.question'), answer: t('faq.questions.0.answer') },
    { id: 2, question: t('faq.questions.1.question'), answer: t('faq.questions.1.answer') },
    { id: 3, question: t('faq.questions.2.question'), answer: t('faq.questions.2.answer') },
    { id: 4, question: t('faq.questions.3.question'), answer: t('faq.questions.3.answer') },
    { id: 5, question: t('faq.questions.4.question'), answer: t('faq.questions.4.answer') },
    { id: 6, question: t('faq.questions.5.question'), answer: t('faq.questions.5.answer') },
    { id: 7, question: t('faq.questions.6.question'), answer: t('faq.questions.6.answer') },
    { id: 8, question: t('faq.questions.7.question'), answer: t('faq.questions.7.answer') },
    { id: 9, question: t('faq.questions.8.question'), answer: t('faq.questions.8.answer') },
    { id: 10, question: t('faq.questions.9.question'), answer: t('faq.questions.9.answer') }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  }
  
  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] as const }
    }
  }

  return (
    <section id="faq" className="py-16 md:py-20 lg:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-8 md:mb-12"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-[160%] mb-3 md:mb-4 text-foreground font-gallery">
            {locale === 'el' ? (
              <>
                Συχνές{" "}
                <span className="text-primary">Ερωτήσεις</span>
              </>
            ) : (
              <>
                Frequently{' '}
                <span className="text-primary">Asked Questions</span>
              </>
            )}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-[40ch] mx-auto leading-relaxed">
            {t('faq.subtitle')}
          </p>
        </motion.div>

        {/* FAQ Items */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={containerVariants}
          className="space-y-3 md:space-y-4"
        >
          {questions.map((faq, index) => (
            <motion.div
              key={faq.id}
              variants={cardVariants}
              className="bg-card border border-border rounded-xl md:rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full px-4 sm:px-6 py-4 sm:py-6 text-left flex items-center justify-between hover:bg-muted/50 transition-colors duration-200"
              >
                <h3 className="text-base sm:text-lg font-semibold text-foreground pr-4">
                  {faq.question}
                </h3>
                <div className="flex-shrink-0">
                  {openItems.includes(index) ? (
                    <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  )}
                </div>
              </button>
              
              <motion.div
                initial={false}
                animate={{
                  height: openItems.includes(index) ? 'auto' : 0,
                  opacity: openItems.includes(index) ? 1 : 0
                }}
                transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                className="overflow-hidden"
              >
                <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          viewport={{ once: true }}
          className="text-center mt-12 md:mt-16"
        >
          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
            {t('faq.ctaText')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              variant="default"
              rightIcon={
                <ArrowRight className="w-4 h-4 transition-transform duration-200 ease-out group-hover:translate-x-1" />
              }
              className="px-6 sm:px-8 group"
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
              {t('navigation.registerPreAlpha')}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}



