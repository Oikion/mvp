"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { Mail, Check, ExternalLink } from "lucide-react"
import { Button } from "@/components/website/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useTranslations, useLocale } from "next-intl"
import { APP_VERSION } from '@/lib/version'

export const NewsletterForm = ({ formId }: { formId: string }) => {
  const t = useTranslations("website")
  const locale = useLocale()
  const [email, setEmail] = useState("")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [preAlphaInterest, setPreAlphaInterest] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !privacyAccepted) return

    setIsLoading(true)

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          privacyAccepted,
          preAlphaInterest,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsSubscribed(true)
        console.log("Newsletter subscription successful:", data.message)

        // Reset form
        setEmail("")
        setPrivacyAccepted(false)
        setPreAlphaInterest(false)
      } else {
        console.error("Newsletter subscription failed:", data.error)
        alert(data.error || "Failed to subscribe. Please try again.")
      }
    } catch (error) {
      console.error("Network error during newsletter subscription:", error)
      alert("Network error. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const getButtonText = () => {
    if (isLoading) {
      return preAlphaInterest
        ? t("finalCta.newsletter.registeringText")
        : t("finalCta.newsletter.subscribingText")
    }
    return preAlphaInterest
      ? t("finalCta.newsletter.registerButton")
      : t("finalCta.newsletter.subscribeButton")
  }

  const getDisabledTooltip = () => {
    if (!email) return t("finalCta.newsletter.emailRequired")
    if (!privacyAccepted) return t("finalCta.newsletter.privacyRequired")
    return undefined
  }

  if (isSubscribed) {
    return (
      <div className="max-w-lg mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-primary/10 rounded-2xl p-8"
        >
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold leading-[160%] mb-4 text-foreground font-gallery">
            {t("finalCta.success.title")}
          </h3>
          <p className="text-lg text-muted-foreground">
            {t("finalCta.success.message")}
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      viewport={{ once: true }}
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 justify-center items-center max-w-lg mx-auto"
    >
      {/* Email Input */}
      <div className="relative w-full">
        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 pointer-events-none" />
        <Input
          type="email"
          placeholder={t("finalCta.newsletter.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="pl-10 py-5 sm:py-6 text-base sm:text-lg w-full"
          required
        />
      </div>

      {/* Pre Alpha Interest Switch */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        viewport={{ once: true }}
        className="w-full bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/15 transition-colors duration-200"
      >
        <Label
          htmlFor={`${formId}-pre-alpha-switch`}
          className="flex items-center justify-between w-full p-3 sm:p-4 cursor-pointer text-left"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              {t("finalCta.newsletter.preAlphaLabel")}
              <a
                href="/changelog"
                className="group inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-all duration-300 ease-out cursor-pointer"
              >
                <span className="relative overflow-hidden h-[14px] flex items-center">
                  <span className="inline-flex items-center gap-1 transition-all duration-300 ease-out group-hover:-translate-y-3 group-hover:opacity-0">
                    v{APP_VERSION}
                  </span>
                  <span className="absolute inset-0 inline-flex items-center gap-1 translate-y-3 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                    <ExternalLink className="w-2.5 h-2.5" />
                    {t("finalCta.newsletter.changelog")}
                  </span>
                </span>
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("finalCta.newsletter.preAlphaDescription")}
            </p>
          </div>
          <Switch
            id={`${formId}-pre-alpha-switch`}
            checked={preAlphaInterest}
            onCheckedChange={setPreAlphaInterest}
            className="ml-3 sm:ml-4 shrink-0"
          />
        </Label>
      </motion.div>

      {/* Privacy Policy Checkbox */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        viewport={{ once: true }}
        className="flex items-start gap-2.5 sm:gap-3 w-full text-left"
      >
        <Checkbox
          id={`${formId}-privacy-checkbox`}
          checked={privacyAccepted}
          onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
          className="mt-1 sm:mt-0.5 shrink-0"
          required
        />
        <Label htmlFor={`${formId}-privacy-checkbox`} className="text-sm sm:text-sm text-muted-foreground cursor-pointer leading-[1.4] sm:leading-relaxed text-left">
          <span dangerouslySetInnerHTML={{
            __html: t('finalCta.newsletter.privacyText')
              .replace('Privacy Policy', `<a href="/${locale}/legal/privacy-policy" class="text-primary hover:underline font-medium">${t('finalCta.newsletter.privacyPolicy')}</a>`)
              .replace('Contact Policy', `<a href="#contact" class="text-primary hover:underline font-medium">${t('finalCta.newsletter.contactPolicy')}</a>`)
              .replace('Πολιτική Απορρήτου', `<a href="/${locale}/legal/privacy-policy" class="text-primary hover:underline font-medium">${t('finalCta.newsletter.privacyPolicy')}</a>`)
              .replace('Πολιτική Επικοινωνίας', `<a href="#contact" class="text-primary hover:underline font-medium">${t('finalCta.newsletter.contactPolicy')}</a>`)
          }} />
        </Label>
      </motion.div>

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        variant="default"
        disabled={isLoading || !email || !privacyAccepted}
        disabledTooltip={getDisabledTooltip()}
        className="px-8 text-base sm:text-lg py-5 sm:py-6 w-full sm:w-auto"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {getButtonText()}
          </div>
        ) : (
          getButtonText()
        )}
      </Button>
    </motion.form>
  )
}




