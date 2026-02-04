'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, ExternalLink } from 'lucide-react'
import { Logo } from './logo'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { APP_VERSION } from '@/lib/version'

export const Footer = () => {
  const t = useTranslations('website')
  const locale = useLocale()

  const footerLinks = {
    legal: [
      { name: t('footer.links.privacyPolicy'), href: `/${locale}/legal/privacy-policy` },
      { name: t('footer.links.termsOfService'), href: `/${locale}/legal/terms-of-service` },
      { name: t('footer.links.cookiePolicy'), href: `/${locale}/legal/cookie-policy` },
      { name: t('footer.links.gdpr'), href: `/${locale}/legal/gdpr` },
      { name: t('footer.links.accessibility'), href: `/${locale}/legal/accessibility` },
      { name: t('footer.links.contact'), href: '#contact' }
    ]
  }

  const socialLinks = [
    { 
      name: t('footer.social.linkedin'), 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:w-5 sm:h-5">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      ), 
      href: 'https://www.linkedin.com/company/oikion',
    }
  ]

  return (
    <footer id="contact" className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
            
            {/* Brand Section */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="max-w-md"
              >
                {/* Logo */}
                <div className="flex items-center justify-center md:justify-start mb-6">
                  <Logo size="lg" />
                </div>
                
                <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 leading-relaxed text-center md:text-left">
                  {t('footer.description')}
                </p>
                
                {/* Contact Info */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4 text-center md:text-left">
                    {t('footer.sections.contact')}
                  </h3>
                  <div className="space-y-3 flex flex-col items-center md:items-start">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <Mail className="w-4 h-4" />
                      </div>
                      <span>{t('footer.contact.email')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <Phone className="w-4 h-4" />
                      </div>
                      <span>{t('footer.contact.phone')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <span>{t('footer.contact.location')}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Links Section */}
            <div className="md:col-start-2 lg:col-start-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <h3 className="text-sm font-semibold text-foreground mb-4 sm:mb-6 text-center md:text-right">
                  {t('footer.sections.legal')}
                </h3>
                <ul className="space-y-3 text-center md:text-right">
                  {footerLinks.legal.map((link) => (
                    <li key={link.name}>
                      <Link 
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 inline-flex items-center group"
                      >
                        {link.name}
                        <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-50 transition-opacity duration-200" />
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* Social Links Section */}
                <div className="mt-8 md:mt-10">
                  <h3 className="text-sm font-semibold text-foreground mb-4 text-center md:text-right">
                    {t('footer.sections.followUs')}
                  </h3>
                  <div className="flex items-center justify-center md:justify-end">
                    {socialLinks.map((social) => (
                      <a
                        key={social.name}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 bg-muted hover:bg-primary group rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                        aria-label={social.name}
                      >
                        <div className="text-muted-foreground group-hover:text-primary-foreground transition-colors duration-200">
                          {social.icon}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-border py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="flex items-center gap-2 text-sm text-muted-foreground text-center sm:text-left"
            >
              <span>© {new Date().getFullYear()} {t('footer.copyright')}</span>
              <Link
                href={`/${locale}/changelog`}
                className="group inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all duration-300 ease-out cursor-pointer"
              >
                <span className="relative overflow-hidden h-[14px] flex items-center">
                  <span className="inline-flex items-center gap-1 transition-all duration-300 ease-out group-hover:-translate-y-3 group-hover:opacity-0">
                    v{APP_VERSION}
                  </span>
                  <span className="absolute inset-0 inline-flex items-center gap-1 translate-y-3 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                    <ExternalLink className="w-2.5 h-2.5" />
                    {t('footer.changelog')}
                  </span>
                </span>
              </Link>
            </motion.div>
            
            {/* Newsletter Link */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-center sm:text-right"
            >
              <a 
                href="#newsletter"
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors duration-200 inline-flex items-center gap-1.5"
                onClick={(e) => {
                  e.preventDefault()
                  const element = document.getElementById('newsletter')
                  if (element) {
                    const headerOffset = 80
                    const elementPosition = element.getBoundingClientRect().top
                    const offsetPosition = elementPosition + window.scrollY - headerOffset
                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
                  }
                }}
              >
                {t('footer.newsletter')}
                <ExternalLink className="w-3 h-3" />
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function LegalFooter() {
  const t = useTranslations('website')
  const locale = useLocale()
  
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="mb-8">
            <Link href={`/${locale}`}>
              <Logo size="default" />
            </Link>
          </div>
          
          <p className="text-sm text-muted-foreground mb-6">
            © {new Date().getFullYear()} Oikion. All rights reserved.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <Link 
              href={`/${locale}/legal/privacy-policy`}
              className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              {t('legal.navigation.privacyPolicy')}
            </Link>
            <Link 
              href={`/${locale}/legal/terms-of-service`}
              className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              {t('legal.navigation.termsOfService')}
            </Link>
            <Link 
              href={`/${locale}/legal/cookie-policy`}
              className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              {t('legal.navigation.cookiePolicy')}
            </Link>
            <Link 
              href={`/${locale}/legal/gdpr`}
              className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              {t('legal.navigation.gdprCompliance')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}




