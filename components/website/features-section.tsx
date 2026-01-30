'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Building2, 
  Users, 
  BarChart3, 
  MessageSquare, 
  FileText,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/website/button'
import { useTranslations } from 'next-intl'

interface Feature {
  id: number
  title: string
  description: string
  icon: React.ReactNode
  backgroundColorClass: string
  borderColorClass: string
  iconColorClass: string
}

export const FeaturesSection: React.FC = () => {
  const t = useTranslations('website')

  const features: Feature[] = [
    {
      id: 1,
      title: t('features.cards.properties.title'),
      description: t('features.cards.properties.description'),
      icon: <Building2 className="w-8 h-8" />,
      backgroundColorClass: 'bg-warning/10 dark:bg-yellow-900/20',
      borderColorClass: 'border-yellow-200 dark:border-yellow-700',
      iconColorClass: 'text-warning dark:text-warning'
    },
    {
      id: 2,
      title: t('features.cards.reports.title'),
      description: t('features.cards.reports.description'),
      icon: <BarChart3 className="w-8 h-8" />,
      backgroundColorClass: 'bg-success/10 dark:bg-success/20/20',
      borderColorClass: 'border-success/30 dark:border-green-700',
      iconColorClass: 'text-success dark:text-success'
    },
    {
      id: 3,
      title: t('features.cards.clients.title'),
      description: t('features.cards.clients.description'),
      icon: <Users className="w-8 h-8" />,
      backgroundColorClass: 'bg-pink-50 dark:bg-pink-900/20',
      borderColorClass: 'border-pink-200 dark:border-pink-700',
      iconColorClass: 'text-pink-600 dark:text-pink-400'
    },
    {
      id: 4,
      title: t('features.cards.feedback.title'),
      description: t('features.cards.feedback.description'),
      icon: <MessageSquare className="w-8 h-8" />,
      backgroundColorClass: 'bg-orange-50 dark:bg-orange-900/20',
      borderColorClass: 'border-orange-200 dark:border-orange-700',
      iconColorClass: 'text-warning dark:text-orange-400'
    },
    {
      id: 5,
      title: t('features.cards.page.title'),
      description: t('features.cards.page.description'),
      icon: <FileText className="w-8 h-8" />,
      backgroundColorClass: 'bg-indigo-50 dark:bg-indigo-900/20',
      borderColorClass: 'border-indigo-200 dark:border-indigo-700',
      iconColorClass: 'text-indigo-600 dark:text-indigo-400'
    }
  ]

  return (
    <section id="features" className="py-16 md:py-20 lg:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-[160%] mb-4 text-foreground max-w-[20ch] mx-auto font-gallery">
            {t('features.title')}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-[38ch] mx-auto leading-relaxed">
            {t('features.subtitle')}
          </p>
        </motion.div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.6, 
                delay: index * 0.1,
                ease: [0.21, 0.47, 0.32, 0.98]
              }}
              viewport={{ once: true }}
              whileHover={{ 
                y: -8,
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
              className={`border-2 rounded-2xl p-6 cursor-pointer transition-shadow duration-300 hover:shadow-lg ${feature.backgroundColorClass} ${feature.borderColorClass}`}
            >
              {/* Icon and Title Row */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-2 ${feature.borderColorClass}`}>
                  <div className={`${feature.iconColorClass} scale-75`}>
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-foreground dark:text-foreground leading-tight">
                  {feature.title}
                </h3>
              </div>
              
              {/* Description */}
              <p className="text-muted-foreground dark:text-muted-foreground leading-relaxed text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <p className="text-muted-foreground mb-6 text-lg">
            {t('features.ctaText')}
          </p>
          <Button
            size="lg"
            variant="default"
            rightIcon={
              <ArrowRight className="w-4 h-4 transition-transform duration-200 ease-out group-hover:translate-x-1" />
            }
            className="px-8 group"
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
        </motion.div>
      </div>
    </section>
  )
}



