'use client'

import { useState } from 'react'
import {
  GSAPPreloader,
  SimpleHero,
  NavigationMenu
} from '@/components/website'

/**
 * Root landing page for the website
 * Accessible at /:locale/ (e.g., /en/, /el/)
 * The app is served at /:locale/app/
 */
export default function HomePage() {
  const [preloaderFinished, setPreloaderFinished] = useState(false)
  const [heroFinished, setHeroFinished] = useState(false)

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <GSAPPreloader onComplete={() => setPreloaderFinished(true)} />
      
      <NavigationMenu 
        variant="landing" 
        trigger={preloaderFinished} 
      />
      
      <main>
        <SimpleHero 
          startAnimation={preloaderFinished} 
          onAnimationComplete={() => setHeroFinished(true)}
        />
      </main>
    </div>
  )
}
