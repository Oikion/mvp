'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { usePathname } from 'next/navigation'
import { Menu, X, LayoutDashboard, LogIn, LogOut } from 'lucide-react'
import { useAuth, useClerk } from '@clerk/nextjs'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Logo } from '../logo'

gsap.registerPlugin(useGSAP)

const NAV_SECTIONS = ['problem', 'solution', 'how-it-works', 'team', 'contact'] as const

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [onLight, setOnLight] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const locale = useLocale()
  const pathname = usePathname()
  const t = useTranslations('landing')
  const { isSignedIn } = useAuth()
  const { signOut } = useClerk()

  const otherLocale = locale === 'el' ? 'en' : 'el'
  const localePath = pathname.replace(`/${locale}`, `/${otherLocale}`)

  useEffect(() => {
    const DARK_SECTIONS = ['hero', 'solution', 'team']

    const onScroll = () => {
      setScrolled(globalThis.scrollY > 30)

      // Detect if the nav (30px below top) overlaps a dark or light section
      const navProbeY = 30
      let isOverDark = false

      for (const id of DARK_SECTIONS) {
        const el = document.getElementById(id)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (rect.top <= navProbeY && rect.bottom >= navProbeY) {
          isOverDark = true
          break
        }
      }
      // Also check footer
      const footer = document.querySelector('footer')
      if (footer) {
        const rect = footer.getBoundingClientRect()
        if (rect.top <= navProbeY && rect.bottom >= navProbeY) {
          isOverDark = true
        }
      }

      setOnLight(!isOverDark)
    }

    globalThis.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => globalThis.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  useGSAP(() => {
    gsap.fromTo(
      navRef.current,
      { y: -60, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 1.4 }
    )
  }, { scope: navRef })

  useGSAP(() => {
    if (!mobileOpen || !mobileMenuRef.current) return
    const items = mobileMenuRef.current.querySelectorAll('.mobile-nav-item')
    gsap.fromTo(
      items,
      { x: 40, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, stagger: 0.06, ease: 'power2.out' }
    )
  }, { dependencies: [mobileOpen] })

  const closeMobileMenu = () => setMobileOpen(false)

  return (
    <>
      <nav
        ref={navRef}
        className={`fixed top-0 left-0 right-0 z-50 h-[60px] flex items-center justify-between px-5 md:px-[52px] transition-[background,border-color,color] duration-400 ${
          scrolled
            ? onLight
              ? 'bg-[#F2EFE9]/95 backdrop-blur-xl border-b border-[#E8E2D9]'
              : 'bg-[#262F27]/97 backdrop-blur-xl border-b border-white/[0.06]'
            : 'bg-transparent border-b border-transparent'
        }`}
        role="navigation"
        aria-label={t('nav.ariaLabel')}
      >
        {/* Logo */}
        <a
          href={`/${locale}`}
          className={`relative z-10 transition-colors duration-300 ${onLight ? 'text-[#262F27]' : 'text-white'}`}
          aria-label="Oikion"
        >
          <Logo size="lg" />
        </a>

        {/* Desktop nav links — center positioned */}
        <ul className="hidden md:flex gap-9 absolute left-1/2 -translate-x-1/2 list-none" role="menubar">
          {NAV_SECTIONS.map(id => (
            <li key={id} role="none">
              <a
                href={`#${id}`}
                role="menuitem"
                className="text-xs font-medium tracking-[0.04em] transition-colors duration-200 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
                style={{ color: onLight ? 'rgba(38,47,39,0.65)' : 'rgba(255,255,255,0.55)' }}
              >
                {t(`nav.${id}`)}
              </a>
            </li>
          ))}
        </ul>

        {/* Right side — language toggle + auth buttons */}
        <div className="flex items-center gap-3">
          {/* Language pill */}
          <div
            className={`hidden sm:flex rounded-[20px] p-[3px] gap-[2px] transition-colors duration-300 ${
              onLight ? 'bg-[#262F27]/[0.06] border border-[#262F27]/[0.1]' : 'bg-white/[0.08] border border-white/[0.12]'
            }`}
            role="radiogroup"
            aria-label={t('nav.languageLabel')}
          >
            {(['el', 'en'] as const).map(code => {
              const isActive = code === locale
              return (
                <a
                  key={code}
                  href={isActive ? undefined : localePath}
                  role="radio"
                  aria-checked={isActive}
                  className="text-[10px] font-bold tracking-[0.1em] uppercase px-[11px] py-[5px] rounded-2xl transition-all duration-200 no-underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7B8C7C]"
                  style={{
                    backgroundColor: isActive
                      ? onLight ? '#262F27' : '#fff'
                      : 'transparent',
                    color: isActive
                      ? onLight ? '#fff' : '#262F27'
                      : onLight ? 'rgba(38,47,39,0.5)' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  {code.toUpperCase()}
                </a>
              )
            })}
          </div>

          {/* Auth-aware buttons */}
          <div className="hidden sm:flex items-center gap-2">
            {isSignedIn ? (
              <>
                <a
                  href={`/${locale}/app`}
                  data-magnetic
                  className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.04em] px-4 py-[9px] rounded-[5px] bg-[#7B8C7C] text-white hover:bg-[#8a9d8b] transition-colors duration-200 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" aria-hidden="true" />
                  {t('nav.dashboard')}
                </a>
                <button
                  onClick={() => signOut({ redirectUrl: `/${locale}` })}
                  aria-label={t('nav.signOut')}
                  className={`p-2 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C] ${
                    onLight ? 'text-[#262F27]/50 hover:text-[#262F27]/90' : 'text-white/50 hover:text-white/90'
                  }`}
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <a
                  href={`/${locale}/app/sign-in`}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.04em] px-4 py-[9px] transition-colors duration-200 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C] ${
                    onLight ? 'text-[#262F27]/70 hover:text-[#262F27]' : 'text-white/70 hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                  {t('nav.signIn')}
                </a>
                <a
                  href={`/${locale}/app/register`}
                  data-magnetic
                  className={`inline-flex items-center text-xs font-semibold tracking-[0.04em] px-5 py-[9px] rounded-[5px] border bg-transparent transition-[background,color,border-color] duration-250 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C] ${
                    onLight
                      ? 'border-[#262F27]/20 text-[#262F27] hover:bg-[#262F27] hover:text-white hover:border-[#262F27]'
                      : 'border-white/20 text-white hover:bg-white hover:text-[#262F27] hover:border-white'
                  }`}
                >
                  {t('nav.signUp')}
                </a>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className={`md:hidden p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C] transition-colors duration-300 ${onLight ? 'text-[#262F27]' : 'text-white'}`}
            onClick={() => setMobileOpen(prev => !prev)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-menu"
            aria-label={mobileOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile fullscreen overlay */}
      {mobileOpen && (
        <div
          id="mobile-nav-menu"
          ref={mobileMenuRef}
          className="fixed inset-0 z-40 bg-[#262F27] flex flex-col items-start justify-center px-8 gap-8 pt-[60px]"
          role="menu"
        >
          {NAV_SECTIONS.map(id => (
            <a
              key={id}
              href={`#${id}`}
              role="menuitem"
              className="mobile-nav-item text-2xl font-light tracking-wide text-white/80 hover:text-white transition-colors no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
              onClick={closeMobileMenu}
            >
              {t(`nav.${id}`)}
            </a>
          ))}

          {/* Mobile auth + language */}
          <div className="flex flex-col gap-4 mt-8">
            {/* Auth buttons */}
            <div className="mobile-nav-item flex items-center gap-3">
              {isSignedIn ? (
                <>
                  <a
                    href={`/${locale}/app`}
                    className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-[5px] bg-[#7B8C7C] text-white no-underline"
                  >
                    <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
                    {t('nav.dashboard')}
                  </a>
                  <button
                    onClick={() => signOut({ redirectUrl: `/${locale}` })}
                    aria-label={t('nav.signOut')}
                    className="p-2 text-white/50 hover:text-white/90"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <>
                  <a
                    href={`/${locale}/app/sign-in`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-white/70 no-underline"
                  >
                    <LogIn className="w-4 h-4" aria-hidden="true" />
                    {t('nav.signIn')}
                  </a>
                  <a
                    href={`/${locale}/app/register`}
                    className="inline-flex items-center text-sm font-semibold px-6 py-3 rounded-[5px] bg-[#7B8C7C] text-white no-underline"
                  >
                    {t('nav.signUp')}
                  </a>
                </>
              )}
            </div>

            {/* Language pill */}
            <div className="mobile-nav-item flex items-center gap-3">
              <div
                className="flex bg-white/[0.08] border border-white/[0.12] rounded-[20px] p-[3px] gap-[2px]"
                role="radiogroup"
                aria-label={t('nav.languageLabel')}
              >
                {(['el', 'en'] as const).map(code => (
                  <a
                    key={code}
                    href={code === locale ? undefined : localePath}
                    role="radio"
                    aria-checked={code === locale}
                    className={`text-[10px] font-bold tracking-[0.1em] uppercase px-[11px] py-[5px] rounded-2xl no-underline transition-all duration-200 ${
                      code === locale
                        ? 'bg-white text-[#262F27]'
                        : 'bg-transparent text-white/45'
                    }`}
                  >
                    {code.toUpperCase()}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
