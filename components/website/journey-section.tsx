'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { 
  FlaskConical, 
  TestTube, 
  Beaker, 
  Rocket, 
  ArrowRight, 
  Calendar, 
  Users, 
  Zap, 
  Shield, 
  Brain, 
  Globe, 
  Target, 
  Star, 
  BarChart,
  MessageSquare,
  Clock
} from 'lucide-react'
import { Button } from '@/components/website/button'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'
import useMobile from '@/hooks/use-mobile'

interface DevelopmentStage {
  id: number
  title: string
  date: string
  description: string
  keyFeatures: Array<{
    icon: React.ReactNode
    title: string
    description: string
  }>
  highlights: Array<{
    icon: React.ReactNode
    text: string
  }>
  icon: React.ReactNode
  color: string
  progress: number
}

export const JourneySection: React.FC = () => {
  const t = useTranslations('website')
  const { isMobile } = useMobile()
  const [activeStep, setActiveStep] = useState(0)

  const stages: DevelopmentStage[] = [
    {
      id: 1,
      title: t('journey.stages.preAlpha.title'),
      date: t('journey.stages.preAlpha.date'),
      description: t('journey.stages.preAlpha.description'),
      keyFeatures: [
        { icon: <Users className="w-4 h-4" />, title: t('journey.stages.preAlpha.keyFeatures.0.title'), description: t('journey.stages.preAlpha.keyFeatures.0.description') },
        { icon: <BarChart className="w-4 h-4" />, title: t('journey.stages.preAlpha.keyFeatures.1.title'), description: t('journey.stages.preAlpha.keyFeatures.1.description') },
        { icon: <MessageSquare className="w-4 h-4" />, title: t('journey.stages.preAlpha.keyFeatures.2.title'), description: t('journey.stages.preAlpha.keyFeatures.2.description') }
      ],
      highlights: [
        { icon: <Star className="w-3 h-3" />, text: t('journey.stages.preAlpha.highlights.0') },
        { icon: <Zap className="w-3 h-3" />, text: t('journey.stages.preAlpha.highlights.1') },
        { icon: <Shield className="w-3 h-3" />, text: t('journey.stages.preAlpha.highlights.2') }
      ],
      icon: <FlaskConical className="w-6 h-6" />,
      color: 'blue',
      progress: 85
    },
    {
      id: 2,
      title: t('journey.stages.closedAlpha.title'),
      date: t('journey.stages.closedAlpha.date'),
      description: t('journey.stages.closedAlpha.description'),
      keyFeatures: [
        { icon: <Users className="w-4 h-4" />, title: t('journey.stages.closedAlpha.keyFeatures.0.title'), description: t('journey.stages.closedAlpha.keyFeatures.0.description') },
        { icon: <BarChart className="w-4 h-4" />, title: t('journey.stages.closedAlpha.keyFeatures.1.title'), description: t('journey.stages.closedAlpha.keyFeatures.1.description') },
        { icon: <MessageSquare className="w-4 h-4" />, title: t('journey.stages.closedAlpha.keyFeatures.2.title'), description: t('journey.stages.closedAlpha.keyFeatures.2.description') }
      ],
      highlights: [
        { icon: <Star className="w-3 h-3" />, text: t('journey.stages.closedAlpha.highlights.0') },
        { icon: <Zap className="w-3 h-3" />, text: t('journey.stages.closedAlpha.highlights.1') },
        { icon: <Shield className="w-3 h-3" />, text: t('journey.stages.closedAlpha.highlights.2') }
      ],
      icon: <TestTube className="w-6 h-6" />,
      color: 'gray',
      progress: 45
    },
    {
      id: 3,
      title: t('journey.stages.closedBeta.title'),
      date: t('journey.stages.closedBeta.date'),
      description: t('journey.stages.closedBeta.description'),
      keyFeatures: [
        { icon: <Globe className="w-4 h-4" />, title: t('journey.stages.closedBeta.keyFeatures.0.title'), description: t('journey.stages.closedBeta.keyFeatures.0.description') },
        { icon: <Brain className="w-4 h-4" />, title: t('journey.stages.closedBeta.keyFeatures.1.title'), description: t('journey.stages.closedBeta.keyFeatures.1.description') },
        { icon: <Target className="w-4 h-4" />, title: t('journey.stages.closedBeta.keyFeatures.2.title'), description: t('journey.stages.closedBeta.keyFeatures.2.description') }
      ],
      highlights: [
        { icon: <Users className="w-3 h-3" />, text: t('journey.stages.closedBeta.highlights.0') },
        { icon: <BarChart className="w-3 h-3" />, text: t('journey.stages.closedBeta.highlights.1') },
        { icon: <Clock className="w-3 h-3" />, text: t('journey.stages.closedBeta.highlights.2') }
      ],
      icon: <Beaker className="w-6 h-6" />,
      color: 'gray',
      progress: 15
    },
    {
      id: 4,
      title: t('journey.stages.publicLaunch.title'),
      date: t('journey.stages.publicLaunch.date'),
      description: t('journey.stages.publicLaunch.description'),
      keyFeatures: [
        { icon: <Shield className="w-4 h-4" />, title: t('journey.stages.publicLaunch.keyFeatures.0.title'), description: t('journey.stages.publicLaunch.keyFeatures.0.description') },
        { icon: <Target className="w-4 h-4" />, title: t('journey.stages.publicLaunch.keyFeatures.1.title'), description: t('journey.stages.publicLaunch.keyFeatures.1.description') },
        { icon: <Globe className="w-4 h-4" />, title: t('journey.stages.publicLaunch.keyFeatures.2.title'), description: t('journey.stages.publicLaunch.keyFeatures.2.description') }
      ],
      highlights: [
        { icon: <Shield className="w-3 h-3" />, text: t('journey.stages.publicLaunch.highlights.0') },
        { icon: <Target className="w-3 h-3" />, text: t('journey.stages.publicLaunch.highlights.1') },
        { icon: <Globe className="w-3 h-3" />, text: t('journey.stages.publicLaunch.highlights.2') }
      ],
      icon: <Rocket className="w-6 h-6" />,
      color: 'gray',
      progress: 0
    }
  ]

  const getColorClasses = (color: string, isActive: boolean) => {
    if (!isActive) {
      return {
        bg: 'bg-gray-400 dark:bg-zinc-600',
        bgLight: 'bg-muted dark:bg-zinc-800/60',
        borderLight: 'border-border dark:border-border',
        text: 'text-muted-foreground dark:text-muted-foreground',
        cardBg: 'bg-card dark:bg-background/80'
      }
    }
    
    return {
      bg: 'bg-primary',
      bgLight: 'bg-primary/10 dark:bg-primary/20/40',
      borderLight: 'border-primary/30 dark:border-primary/50/60',
      text: 'text-primary dark:text-primary',
      cardBg: 'bg-card dark:bg-background/80'
    }
  }

  // Ref for tracking timeline height
  const timelineRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })
  const [timelineHeight, setTimelineHeight] = useState(0)

  // Calculate the height of the first stage for the blue progress line
  useEffect(() => {
    if (timelineRef.current && isInView) {
      // Get the first stage element to determine where the blue line should end
      const firstStageCard = timelineRef.current.querySelector('[data-stage="0"]')
      if (firstStageCard) {
        const cardRect = firstStageCard.getBoundingClientRect()
        const timelineRect = timelineRef.current.getBoundingClientRect()
        // End the blue line at the bottom of the first stage card
        setTimelineHeight(cardRect.bottom - timelineRect.top)
      }
    }
  }, [isInView])

  return (
    <section 
      ref={sectionRef}
      id="how-it-works" 
      className="py-16 md:py-20 lg:py-24 overflow-x-hidden bg-background dark:bg-zinc-950/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-[160%] mb-4 text-foreground font-gallery">
            {t('journey.title')}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-[40ch] mx-auto leading-relaxed">
            {t('journey.subtitle')}
          </p>
        </motion.div>

        {/* Timeline Container */}
        <div ref={timelineRef} className="relative">
          {/* Background Progress Line (Gray) */}
          <div className="absolute left-4 sm:left-8 top-0 bottom-0 w-0.5 bg-border dark:bg-zinc-700"></div>
          
          {/* Animated Blue Progress Line */}
          <motion.div 
            className="absolute left-4 sm:left-8 top-0 w-0.5 bg-gradient-to-b from-blue-500 via-blue-500 to-blue-400 rounded-full"
            style={{ 
              originY: 0,
              boxShadow: '0 0 8px rgba(59, 130, 246, 0.5), 0 0 16px rgba(59, 130, 246, 0.3)'
            }}
            initial={{ height: 0 }}
            animate={isInView ? { height: timelineHeight || '25%' } : { height: 0 }}
            transition={{ 
              duration: 1.5, 
              delay: 0.3,
              ease: [0.16, 1, 0.3, 1] // Custom easing for smooth animation
            }}
          />

          {/* Development Stages */}
          <div className="space-y-10 md:space-y-16">
            {stages.map((stage, index) => {
              const isActive = index === 0
              const colors = getColorClasses(stage.color, isActive)
              
              return (
                <motion.div
                  key={stage.id}
                  data-stage={index}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ 
                    duration: 0.6, 
                    delay: index * 0.1,
                    ease: [0.21, 0.47, 0.32, 0.98]
                  }}
                  viewport={{ once: true }}
                  className="relative flex items-start gap-4 sm:gap-8"
                >
                  {/* Stage Bullet */}
                  <div className="relative flex-shrink-0 z-10">
                    <motion.div 
                      className={`w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full border-2 md:border-4 flex items-center justify-center transition-all duration-300 ${
                        isActive 
                          ? `${colors.bg} border-primary dark:border-primary text-white shadow-lg shadow-blue-500/30` 
                          : 'bg-background dark:bg-background border-border dark:border-border text-muted-foreground'
                      }`}
                      initial={isActive ? { scale: 0.8, opacity: 0 } : undefined}
                      animate={isActive ? { scale: 1, opacity: 1 } : undefined}
                      transition={{ duration: 0.5, delay: 0.5 }}
                    >
                      {stage.icon}
                    </motion.div>
                    {/* Glow effect for active stage */}
                    {isActive && (
                      <motion.div 
                        className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                      />
                    )}
                  </div>

                  {/* Stage Content */}
                  <div className="flex-1 pb-6 md:pb-8">
                    <motion.div 
                      className={`border rounded-xl md:rounded-2xl overflow-hidden transition-all duration-300 ${
                        isActive 
                          ? `${colors.bgLight} ${colors.borderLight}` 
                          : `${colors.cardBg} border-border dark:border-zinc-800 hover:border-primary/20 dark:hover:border-zinc-600`
                      }`}
                      whileHover={!isMobile ? { y: -4, scale: 1.01 } : undefined}
                    >
                      {/* Header Section */}
                      <div className="p-4 sm:p-6 pb-3 sm:pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                          <h3 className={`text-lg sm:text-xl font-bold transition-colors duration-300 ${
                            isActive ? colors.text : 'text-foreground dark:text-foreground'
                          }`}>
                            {stage.title}
                          </h3>
                          <Badge variant="outline" className="w-fit dark:border-border dark:text-zinc-300">
                            <Calendar className="w-3 h-3 mr-1" />
                            {stage.date}
                          </Badge>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mb-3 sm:mb-4">
                          <div className="flex items-center justify-between text-xs text-muted-foreground dark:text-muted-foreground mb-2">
                            <span>{t('journey.developmentProgress')}</span>
                            <span className="font-medium">{stage.progress}%</span>
                          </div>
                          <div className="w-full bg-background dark:bg-zinc-800 border border-border dark:border-border rounded-full h-2 overflow-hidden">
                            <motion.div 
                              className={`h-full ${isActive ? colors.bg : 'bg-gray-400 dark:bg-zinc-600'} rounded-full`}
                              initial={{ width: 0 }}
                              whileInView={{ width: `${stage.progress}%` }}
                              transition={{ duration: 1.5, delay: index * 0.2 }}
                              viewport={{ once: true }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Key Features Grid */}
                      <div className="px-4 sm:px-6 pb-3 sm:pb-4">
                        <h4 className="text-sm font-semibold text-foreground dark:text-foreground mb-2 sm:mb-3 flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          {t('journey.keyFeatures')}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                          {stage.keyFeatures.map((feature, featureIndex) => (
                            <div
                              key={featureIndex}
                              className={`p-2 sm:p-3 rounded-lg border transition-colors ${
                                isActive 
                                  ? 'bg-background/50 dark:bg-background/50 border-border dark:border-border' 
                                  : 'bg-muted/30 dark:bg-zinc-800/50 border-muted dark:border-border/50'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`p-1 rounded ${isActive ? colors.bg : 'bg-gray-400 dark:bg-zinc-600'} text-white`}>
                                  {feature.icon}
                                </div>
                                <span className="text-xs font-medium text-foreground dark:text-foreground">{feature.title}</span>
                              </div>
                              <p className="text-xs text-muted-foreground dark:text-muted-foreground">{feature.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Highlights */}
                      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                        <div className="flex flex-wrap gap-2">
                          {stage.highlights.map((highlight, highlightIndex) => (
                            <div
                              key={highlightIndex}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                isActive 
                                  ? 'bg-background dark:bg-background border border-border dark:border-border text-foreground dark:text-foreground' 
                                  : 'bg-muted dark:bg-zinc-800/70 text-muted-foreground dark:text-muted-foreground border border-muted dark:border-border/50'
                              }`}
                            >
                              <div className={`${isActive ? colors.text : 'text-muted-foreground dark:text-muted-foreground'}`}>
                                {highlight.icon}
                              </div>
                              {highlight.text}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                        <div className="bg-background/50 dark:bg-background/50 border border-border/30 dark:border-border/30 rounded-lg p-3 sm:p-4">
                          <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground leading-relaxed">
                            {stage.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
          className="text-center mt-12 md:mt-16"
        >
          <p className="text-base sm:text-lg text-muted-foreground dark:text-muted-foreground mb-4 sm:mb-6 max-w-[45ch] mx-auto">
            {t('journey.ctaText')}
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
          <div className="mt-4 text-sm text-muted-foreground dark:text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              <span>{t('journey.status')} <strong className="text-foreground dark:text-foreground">{t('journey.preAlpha')}</strong> - {t('journey.limitedSpots')}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}



