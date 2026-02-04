'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, LogIn, LogOut, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/website/button'
import { Logo } from './logo'
import { useTranslations, useLocale } from 'next-intl'
import useMobile from '@/hooks/use-mobile'
import { useAuth, useClerk } from '@clerk/nextjs'
import { ThemeAndLanguageToggle } from './theme-language-toggle'

interface NavigationMenuProps {
  variant?: 'landing' | 'legal'
  trigger?: boolean
}

export const NavigationMenu = ({ variant = 'landing', trigger = true }: NavigationMenuProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const locale = useLocale()
  const t = useTranslations('website')
  const { isMobile, isTablet } = useMobile()
  const showMobileMenu = isMobile || isTablet
  const { isSignedIn } = useAuth()
  const { signOut } = useClerk()

  const isLegalPage = variant === 'legal'

  useEffect(() => {
    if (!showMobileMenu) {
      setMobileMenuOpen(false)
    }
  }, [showMobileMenu])

  useEffect(() => {
    const handleScrollChange = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScrollChange)
    handleScrollChange()
    return () => window.removeEventListener('scroll', handleScrollChange)
  }, [])

  return (
    <motion.nav
      initial={{ opacity: 0, y: '-100%' }}
      animate={trigger ? { opacity: 1, y: 0 } : { opacity: 0, y: '-100%' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || isLegalPage ? 'bg-background/90 backdrop-blur-lg shadow-sm' : 'bg-background/0'
      } ${mobileMenuOpen ? 'bg-background' : ''}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <motion.div whileHover={{ scale: 1.02 }} className="flex items-center">
            <Link href={`/${locale}`}>
              <Logo size={showMobileMenu ? 'default' : 'lg'} />
            </Link>
          </motion.div>

          <div className="flex items-center">
            {!showMobileMenu && (
              <div className="flex items-center gap-3">
                {/* Auth Buttons */}
                {isSignedIn ? (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      className="px-4"
                      asChild
                    >
                      <Link href={`/${locale}/app`} className="inline-flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4" />
                        {t('navigation.dashboard')}
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="px-2"
                      onClick={() => signOut({ redirectUrl: `/${locale}` })}
                      aria-label={t('navigation.signOut')}
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="px-4"
                      asChild
                    >
                      <Link href={`/${locale}/app/sign-in`} className="inline-flex items-center gap-2">
                        <LogIn className="w-4 h-4" />
                        {t('navigation.signIn')}
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="px-4"
                      asChild
                    >
                      <Link href={`/${locale}/app/register`}>
                        {t('navigation.getStarted')}
                      </Link>
                    </Button>
                  </>
                )}
                <ThemeAndLanguageToggle />
              </div>
            )}

            {showMobileMenu && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-foreground focus:outline-none"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showMobileMenu && mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-background border-b border-border overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col space-y-3">
              {/* Mobile Auth Buttons */}
              <div className="pt-4 border-t border-border space-y-2">
                {isSignedIn ? (
                  <div className="flex gap-2">
                    <Button
                      size="default"
                      variant="default"
                      className="flex-1"
                      asChild
                    >
                      <Link href={`/${locale}/app`} className="inline-flex items-center justify-center gap-2">
                        <LayoutDashboard className="w-4 h-4" />
                        {t('navigation.dashboard')}
                      </Link>
                    </Button>
                    <Button
                      size="default"
                      variant="outline"
                      className="px-3"
                      onClick={() => signOut({ redirectUrl: `/${locale}` })}
                      aria-label={t('navigation.signOut')}
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      size="default"
                      variant="outline"
                      className="w-full"
                      asChild
                    >
                      <Link href={`/${locale}/app/sign-in`} className="inline-flex items-center justify-center gap-2">
                        <LogIn className="w-4 h-4" />
                        {t('navigation.signIn')}
                      </Link>
                    </Button>
                    <Button
                      size="default"
                      variant="default"
                      className="w-full"
                      asChild
                    >
                      <Link href={`/${locale}/app/register`}>
                        {t('navigation.getStarted')}
                      </Link>
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center justify-center gap-4 pt-2 pb-2 border-t border-border mt-2">
                <ThemeAndLanguageToggle />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
