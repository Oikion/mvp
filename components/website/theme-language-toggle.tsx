'use client'

import * as React from 'react'
import { Moon, Sun, Palette, Check } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useLocale, useTranslations } from 'next-intl'
import { availableLocales } from '@/lib/locales'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Flag emojis for each locale
const localeFlags: Record<string, string> = {
  el: '🇬🇷',
  en: '🇬🇧',
}

/**
 * ThemeAndLanguageToggle Component - Website
 * 
 * Consolidated dropdown for theme and language selection
 */
export function ThemeAndLanguageToggle() {
  const { setTheme, theme } = useTheme()
  const locale = useLocale()
  const t = useTranslations('Navigation')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled>
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Settings</span>
      </Button>
    )
  }

  const themes = [
    { value: 'light', label: t('themes.light'), icon: Sun },
    { value: 'dark', label: t('themes.dark'), icon: Moon },
    { value: 'pearl-sand', label: t('themes.pearlSand'), icon: Palette },
    { value: 'twilight-lavender', label: t('themes.twilightLavender'), icon: Palette },
  ]

  const languages = availableLocales.map((loc) => ({
    label: t(`languages.${loc.code}` as any) || loc.name,
    value: loc.code,
    flag: localeFlags[loc.code] || '🌐',
  }))

  const currentTheme = themes.find((t) => t.value === theme) || themes[0]
  const ThemeIcon = currentTheme.icon

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) {
      return
    }

    // Get the current pathname
    const currentPath = window.location.pathname

    // Remove any existing locale prefix from pathname
    let cleanPathname = currentPath
    const availableLocaleCodes = availableLocales.map((l) => l.code)

    for (const loc of availableLocaleCodes) {
      if (cleanPathname.startsWith(`/${loc}/`)) {
        cleanPathname = cleanPathname.substring(`/${loc}`.length)
        break
      } else if (cleanPathname === `/${loc}`) {
        cleanPathname = '/'
        break
      }
    }

    // Ensure cleanPathname starts with /
    if (!cleanPathname.startsWith('/')) {
      cleanPathname = '/' + cleanPathname
    }

    // Construct the new URL with the new locale
    const pathSegment = cleanPathname === '/' ? '' : cleanPathname
    const newUrl = `/${newLocale}${pathSegment}${window.location.search}`

    // Navigate to the new locale path
    window.location.href = newUrl
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <ThemeIcon className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Theme and Language Settings</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t('theme')}</DropdownMenuLabel>
        {themes.map((themeOption) => {
          const ThemeOptionIcon = themeOption.icon
          return (
            <DropdownMenuItem
              key={themeOption.value}
              onClick={() => setTheme(themeOption.value)}
              className="flex items-center gap-2"
            >
              <ThemeOptionIcon className="h-4 w-4" />
              <span>{themeOption.label}</span>
              {theme === themeOption.value && (
                <Check className="ml-auto h-4 w-4" />
              )}
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Sun className="h-4 w-4 mr-2" />
          <span>{t('themes.system')}</span>
          {theme === 'system' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('language')}</DropdownMenuLabel>
        <div className="px-2 py-1.5">
          <div className="flex items-center gap-2 justify-center">
            {languages.map((language) => {
              const isSelected = locale === language.value
              return (
                <button
                  key={language.value}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleLanguageChange(language.value)
                  }}
                  disabled={isSelected}
                  className={cn(
                    'relative flex items-center justify-center w-10 h-10 rounded-md transition-all',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    'disabled:opacity-100 disabled:cursor-default',
                    isSelected && 'ring-2 ring-primary bg-primary/5'
                  )}
                  aria-label={language.label}
                  title={language.label}
                >
                  <span className="text-2xl">{language.flag}</span>
                  {isSelected && (
                    <Check className="absolute -top-1 -right-1 h-3.5 w-3.5 text-primary bg-background rounded-full p-0.5" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
