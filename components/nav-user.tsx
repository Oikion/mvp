"use client"

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
  Palette,
  Languages,
  Sun,
  Moon,
  Check,
  Gift,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useClerk } from "@clerk/nextjs"
import { useTheme } from "next-themes"
import { useLocale, useTranslations } from "next-intl"
import { useRouter, usePathname } from "@/navigation"
import axios from "axios"
import { useAppToast } from "@/hooks/use-app-toast";
import { useState } from "react"
import { availableLocales } from "@/lib/locales"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { signOut } = useClerk()
  const { setTheme, theme } = useTheme()
  const locale = useLocale()
  const pathname = usePathname()
  const t = useTranslations()
  const [isChangingLanguage, setIsChangingLanguage] = useState(false)

  // Dynamically generate languages list from available locales
  const languages = availableLocales.map((locale) => ({
    label: t(`Navigation.languages.${locale.code}` as any) || locale.name,
    value: locale.code,
  }))

  const themes = [
    { value: "light", label: t("Navigation.themes.light"), icon: Sun },
    { value: "dark", label: t("Navigation.themes.dark"), icon: Moon },
    { value: "pearl-sand", label: t("Navigation.themes.pearlSand"), icon: Palette },
    { value: "twilight-lavender", label: t("Navigation.themes.twilightLavender"), icon: Palette },
  ]

  const handleLanguageChange = async (e: React.MouseEvent, newLocale: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (newLocale === locale) {
      return
    }
    
    setIsChangingLanguage(true)
    try {
      // Update user language preference in database
      // API uses authenticated user's session, no userId needed
      const response = await axios.put(`/api/user/set-language`, {
        language: newLocale,
      })
      
      if (response.status !== 200) {
        throw new Error(response.data?.error || 'Failed to update language')
      }
      
      // Get the actual browser pathname (includes locale)
      // e.g., "/en/crm/clients" -> "/crm/clients"
      const currentPath = window.location.pathname
      
      // Remove any existing locale prefix from pathname to prevent locale stacking
      let cleanPathname = currentPath
      const availableLocaleCodes = availableLocales.map(l => l.code)
      
      for (const loc of availableLocaleCodes) {
        if (cleanPathname.startsWith(`/${loc}/`)) {
          cleanPathname = cleanPathname.substring(`/${loc}`.length)
          break
        } else if (cleanPathname === `/${loc}`) {
          cleanPathname = '/'
          break
        }
      }
      
      // Ensure cleanPathname starts with / (it should after stripping locale)
      if (!cleanPathname.startsWith('/')) {
        cleanPathname = '/' + cleanPathname
      }
      
      // Construct the new URL with the new locale
      const pathSegment = cleanPathname === '/' ? '' : cleanPathname
      const newUrl = `/${newLocale}${pathSegment}`
      
      // Navigate to the new locale path using absolute URL to prevent locale stacking
      // Using window.location.href with absolute path ensures proper navigation
      window.location.href = newUrl
    } catch (error: any) {
      console.error("Error changing language:", error)
      
      // Extract error message from axios response or use default
      const errorMessage = error?.response?.data?.error 
        || error?.message 
        || t("Navigation.languageChangeFailed")
      
      toast.error(t, { description: errorMessage, isTranslationKey: false })
      setIsChangingLanguage(false)
    }
  }

  const currentTheme = themes.find((t) => t.value === theme) || themes[0]
  const currentLanguage = languages.find((l) => l.value === locale) || languages[0]

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div 
                className="flex items-center gap-2 px-1 py-1.5 text-left text-sm cursor-pointer hover:bg-accent rounded-md transition-colors"
                onClick={() => router.push("/app/profile")}
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/pricing")}>
                <Sparkles />
                {t("Navigation.upgradeToPro")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/app/profile")}>
                <BadgeCheck />
                {t("Navigation.account")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/app/profile")}>
                <CreditCard />
                {t("Navigation.billing")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/app/notifications")}>
                <Bell />
                {t("Navigation.notifications")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/app/referral-portal")}>
                <Gift />
                {t("Navigation.referrals")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Palette />
                  {t("Navigation.theme")}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {themes.map((themeOption) => {
                    const ThemeIcon = themeOption.icon
                    return (
                      <DropdownMenuItem
                        key={themeOption.value}
                        onClick={() => setTheme(themeOption.value)}
                        className="flex items-center gap-2"
                      >
                        <ThemeIcon className="h-4 w-4" />
                        <span>{themeOption.label}</span>
                        {theme === themeOption.value && (
                          <Check className="ml-auto h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                    )
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Sun className="h-4 w-4" />
                    <span>{t("Navigation.themes.system")}</span>
                    {theme === "system" && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={isChangingLanguage}>
                  <Languages />
                  {t("Navigation.language")}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {languages.map((language) => (
                    <DropdownMenuItem
                      key={language.value}
                      onClick={(e) => handleLanguageChange(e, language.value)}
                      className="flex items-center gap-2"
                      disabled={isChangingLanguage || locale === language.value}
                    >
                      <span>{language.label}</span>
                      {locale === language.value && (
                        <Check className="ml-auto h-4 w-4" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut />
              {t("Navigation.logOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
