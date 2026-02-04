'use client'

import React, { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Building, Users, Calendar, BarChart3, Home, FileText, TrendingUp, MessageSquare, Bell, Search, Filter, Plus, Menu, X } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { NewsletterForm } from './newsletter-form'

// TextReveal component
interface TextRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
  stagger?: number
  text?: string
}

const TextReveal: React.FC<TextRevealProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 1,
  stagger = 0.05,
  text
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = React.useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || !containerRef.current) return
    if (typeof window === 'undefined') return

    const container = containerRef.current
    const textContent = text || container.innerText
    if (!textContent) return

    const words = textContent.split(' ')
    
    container.innerHTML = words
      .map(word => `<span class="word-wrapper" style="display: inline-block; overflow: hidden;"><span class="reveal-word" style="display: inline-block; transform: translateY(100%); opacity: 0; transition: transform ${duration}s ease-out, opacity ${duration}s ease-out;">${word}</span></span>`)
      .join(' ')

    const revealWords = container.querySelectorAll('.reveal-word') as NodeListOf<HTMLElement>

    setTimeout(() => {
      revealWords.forEach((word, index) => {
        setTimeout(() => {
          word.style.transform = 'translateY(0%)'
          word.style.opacity = '1'
        }, index * stagger * 1000)
      })
    }, delay * 1000)
  }, [delay, duration, stagger, isClient, text])

  return (
    <div ref={containerRef} className={`overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

// Skeleton components for the demo
const SkeletonCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    className={`bg-card rounded-lg border border-border p-6 shadow-sm ${className}`}
  >
    {children}
  </motion.div>
)

const MetricCardSkeleton = ({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) => (
  <SkeletonCard>
    <div className="flex items-center justify-between">
      <div>
        <div className="h-3 bg-muted rounded w-24 mb-3 animate-pulse"></div>
        <div className="h-6 bg-foreground/10 rounded w-16 mb-3 animate-pulse"></div>
        <div className="h-3 bg-muted rounded w-20 animate-pulse"></div>
      </div>
      <div className="p-3 bg-muted/30 rounded-lg">
        <Icon className="h-6 w-6 text-muted-foreground/70" />
      </div>
    </div>
  </SkeletonCard>
)

// Mini dashboard demo
const WebsiteDemoPage = () => (
  <div className="bg-background min-h-screen">
    <header className="bg-card border-b border-border px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="text-xl font-bold text-foreground ml-2">Oikion</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Bell className="h-5 w-5 text-muted-foreground" />
          <div className="w-8 h-8 bg-muted/50 rounded-full animate-pulse"></div>
        </div>
      </div>
    </header>

    <div className="flex">
      <aside className="hidden lg:block w-64 bg-card border-r border-border p-4">
        <nav className="space-y-2">
          {[
            { icon: Home, label: "Dashboard", active: true },
            { icon: Building, label: "Properties" },
            { icon: Users, label: "Clients" },
            { icon: Calendar, label: "Calendar" },
            { icon: BarChart3, label: "Analytics" },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center space-x-3 p-3 rounded-lg ${
                item.active ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-6">
        <div className="mb-8">
          <div className="h-8 bg-muted rounded w-64 mb-3 animate-pulse"></div>
          <div className="h-4 bg-foreground/10 rounded w-96 animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCardSkeleton icon={Building} />
          <MetricCardSkeleton icon={Users} />
          <MetricCardSkeleton icon={TrendingUp} />
          <MetricCardSkeleton icon={Calendar} />
        </div>
      </main>
    </div>
  </div>
)

export const HeroSection = () => {
  const demoRef = useRef<HTMLDivElement>(null)
  const locale = useLocale()
  const t = useTranslations('website')
  
  const { scrollYProgress } = useScroll({
    target: demoRef,
    offset: ["start end", "end start"]
  })
  
  const scale = useTransform(scrollYProgress, [0, 0.6], [0.8, 1.05])

  useEffect(() => {
    const demoElement = demoRef.current
    if (demoElement) {
      const focusableElements = demoElement.querySelectorAll(
        'a, button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      focusableElements.forEach(el => {
        el.setAttribute('tabindex', '-1')
      })
    }
  }, [])

  const heroTitle = t('hero.title')
  const titleMaxWidthClass = locale === 'el' ? 'max-w-[20ch]' : 'max-w-[16ch]'
  
  return (
    <section className="relative min-h-[90vh] md:min-h-screen flex flex-col items-center justify-center pt-20 md:pt-24 lg:pt-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center gap-6 md:gap-8">

        <TextReveal
          className={`text-display font-gallery ${titleMaxWidthClass} text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-[160%] text-foreground text-center`}
          delay={0.5}
          duration={0.8}
          stagger={0.08}
          text={heroTitle}
        >
          <h1 className={`text-display font-gallery ${titleMaxWidthClass} text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-[160%] text-foreground`}>
            {heroTitle}
          </h1>
        </TextReveal>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.5 }}
          className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-[55ch] mx-auto leading-relaxed"
        >
          {t('hero.subtitle')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.8 }}
          className="w-full max-w-lg mx-auto"
        >
          <NewsletterForm formId="hero-newsletter" />
        </motion.div>
        
        <div className="w-full max-w-5xl mx-auto mt-6 md:mt-8 lg:mt-10 relative">
          <motion.div
            ref={demoRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 1.9, ease: [0.16, 1, 0.3, 1] }}
            style={{ scale, position: "relative" }}
            className="w-full mx-auto relative"
            aria-hidden="true"
          >
            <div className="rounded-t-2xl overflow-hidden max-h-[300px] sm:max-h-[400px] md:max-h-[450px] lg:max-h-[500px] relative">
              <div className="transform scale-[0.65] sm:scale-[0.7] md:scale-[0.75] origin-top-left w-[153.84%] sm:w-[142.85%] md:w-[133.33%]">
                <WebsiteDemoPage />
              </div>
            </div>
            {/* Gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-48 sm:h-56 md:h-64 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none -mb-12 sm:-mb-14 md:-mb-16"></div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}



