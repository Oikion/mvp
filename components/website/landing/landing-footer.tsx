'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Logo } from '../logo'

export function LandingFooter() {
  const t = useTranslations('landing')
  const locale = useLocale()
  const year = new Date().getFullYear()

  return (
    <footer
      className="bg-[#262F27] border-t border-white/[0.06] px-5 md:px-[52px] py-12 md:py-16"
      role="contentinfo"
    >
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr] gap-10 md:gap-16 mb-12">

          {/* Brand column */}
          <div>
            <div className="text-white mb-4">
              <Logo size="lg" />
            </div>
            <p className="text-[13px] text-white/40 leading-relaxed max-w-[300px] mb-6">
              {t('footer.tagline')}
            </p>
            <p className="text-[11px] text-white/25 italic">
              {t('footer.mission')}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30 mb-4">
              {t('footer.navTitle')}
            </h3>
            <nav aria-label={t('footer.navAriaLabel')}>
              <ul className="space-y-2.5 list-none">
                {['problem', 'solution', 'how-it-works', 'quiz', 'team', 'contact'].map(id => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="
                        text-[13px] text-white/45 hover:text-white/80
                        transition-colors duration-200
                        focus-visible:outline-2 focus-visible:outline-offset-2
                        focus-visible:outline-[#7B8C7C]
                      "
                    >
                      {t(`nav.${id}` as Parameters<typeof t>[0])}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30 mb-4">
              {t('footer.legalTitle')}
            </h3>
            <nav aria-label={t('footer.legalAriaLabel')}>
              <ul className="space-y-2.5 list-none">
                {[
                  { href: `/${locale}/legal/privacy-policy`, label: t('footer.privacy') },
                  { href: `/${locale}/legal/terms-of-service`, label: t('footer.terms') },
                  { href: `/${locale}/legal/cookie-policy`, label: t('footer.cookies') },
                  { href: `/${locale}/legal/accessibility`, label: t('footer.accessibility') },
                ].map(link => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="
                        text-[13px] text-white/45 hover:text-white/80
                        transition-colors duration-200
                        focus-visible:outline-2 focus-visible:outline-offset-2
                        focus-visible:outline-[#7B8C7C]
                      "
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-white/20">
            &copy; {year} Oikion. {t('footer.rights')}
          </p>
          <p className="text-[11px] text-white/20">
            {t('footer.madeIn')}
          </p>
        </div>
      </div>
    </footer>
  )
}
