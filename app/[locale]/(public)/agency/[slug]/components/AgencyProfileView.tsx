"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Linkedin,
  Instagram,
  Twitter,
  Award,
  Calendar,
  ExternalLink,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AgencyContactForm } from "./AgencyContactForm";
import { AgencyActionButtons } from "./AgencyActionButtons";
import { Logo } from "@/components/website/logo";
import { ThemeAndLanguageToggle } from "@/components/website/theme-language-toggle";
import { Button } from "@/components/website/button";
import { APP_VERSION } from "@/lib/version";
import { parseContactFormFields } from "@/lib/contact-form-types";

type AgencyProfile = NonNullable<
  Awaited<ReturnType<typeof import("@/actions/organization/agency-profile").getPublicAgencyProfile>>
>;

interface AgencyProfileViewProps {
  profile: AgencyProfile;
  locale?: string;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] as const },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] as const },
  },
};

export function AgencyProfileView({
  profile,
  locale = "en",
}: AgencyProfileViewProps) {
  const t = useTranslations("profile");
  const socialLinks = profile.socialLinks as Record<string, string | undefined> | null | undefined;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href={`/${locale}`}>
              <Logo size="default" />
            </Link>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/${locale}/app/sign-in`}>
                  {t("agentProfile.signIn")}
                </Link>
              </Button>
              <ThemeAndLanguageToggle />
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center text-center"
          >
            {/* Logo */}
            <motion.div variants={itemVariants}>
              {profile.logo ? (
                <div className="relative h-32 w-32 md:h-40 md:w-40 overflow-hidden rounded-2xl border-4 border-primary/20 shadow-xl bg-muted">
                  <Image
                    src={profile.logo}
                    alt={profile.name}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 128px, 160px"
                  />
                </div>
              ) : (
                <div className="h-32 w-32 md:h-40 md:w-40 rounded-2xl border-4 border-primary/20 shadow-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-16 w-16 md:h-20 md:w-20 text-primary" aria-hidden />
                </div>
              )}
            </motion.div>

            {/* Name */}
            <motion.h1
              variants={itemVariants}
              className="mt-6 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground font-gallery"
            >
              {profile.name}
            </motion.h1>

            {/* Year Founded */}
            {profile.yearFounded && (
              <motion.p
                variants={itemVariants}
                className="mt-3 flex items-center gap-2 text-muted-foreground text-lg"
              >
                <Calendar className="h-5 w-5 text-primary" aria-hidden />
                <span>
                  {t("agentProfile.founded")} {profile.yearFounded}
                </span>
              </motion.p>
            )}

            {/* Location badge */}
            {(profile.city || profile.region) && (
              <motion.div variants={itemVariants} className="mt-3">
                <Badge
                  className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-sm px-4 py-1"
                >
                  <MapPin className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                  {[profile.city, profile.region].filter(Boolean).join(", ")}
                </Badge>
              </motion.div>
            )}

            {/* Stats */}
            {/* Action Buttons */}
            <motion.div variants={itemVariants}>
              <AgencyActionButtons
                locale={locale}
                profilePath={`/${locale}/agency/${profile.slug}`}
                onCollaborate={() => {
                  const el = document.getElementById("agency-contact-form");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Content Area */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Contact & Info Cards */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              viewport={{ once: true }}
              className="space-y-6 order-2 lg:order-1"
            >
              {/* Contact Card */}
              <motion.div
                variants={cardVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="border rounded-2xl p-6 bg-background border-border shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/30">
                    <Users className="w-6 h-6 text-primary dark:text-primary" aria-hidden />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {t("agentProfile.contact")}
                  </h3>
                </div>
                <div className="space-y-3">
                  {profile.email && (
                    <a
                      href={`mailto:${profile.email}`}
                      className="flex items-center gap-3 text-muted-foreground hover:text-primary dark:hover:text-primary transition-colors"
                    >
                      <Mail className="h-4 w-4 flex-shrink-0" aria-hidden />
                      <span className="text-sm truncate">{profile.email}</span>
                    </a>
                  )}
                  {profile.phone && (
                    <a
                      href={`tel:${profile.phone}`}
                      className="flex items-center gap-3 text-muted-foreground hover:text-primary dark:hover:text-primary transition-colors"
                    >
                      <Phone className="h-4 w-4 flex-shrink-0" aria-hidden />
                      <span className="text-sm">{profile.phone}</span>
                    </a>
                  )}
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-muted-foreground hover:text-primary dark:hover:text-primary transition-colors"
                    >
                      <Globe className="h-4 w-4 flex-shrink-0" aria-hidden />
                      <span className="text-sm truncate">{profile.website}</span>
                    </a>
                  )}
                  {!profile.email && !profile.phone && !profile.website && (
                    <p className="text-sm text-muted-foreground italic">
                      {t("agentProfile.noContactInfo")}
                    </p>
                  )}

                  {/* Social Links */}
                  {socialLinks && Object.keys(socialLinks).some((k) => socialLinks[k]) && (
                    <div className="pt-3 border-t border-border flex flex-wrap gap-2">
                      {socialLinks.linkedin && (
                        <a
                          href={socialLinks.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-lg bg-muted hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                          aria-label="LinkedIn"
                        >
                          <Linkedin className="h-4 w-4 text-muted-foreground" aria-hidden />
                        </a>
                      )}
                      {socialLinks.instagram && (
                        <a
                          href={socialLinks.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-lg bg-muted hover:bg-accent transition-colors"
                          aria-label="Instagram"
                        >
                          <Instagram className="h-4 w-4 text-muted-foreground" aria-hidden />
                        </a>
                      )}
                      {socialLinks.twitter && (
                        <a
                          href={socialLinks.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-lg bg-muted hover:bg-accent transition-colors"
                          aria-label="Twitter"
                        >
                          <Twitter className="h-4 w-4 text-muted-foreground" aria-hidden />
                        </a>
                      )}
                      {socialLinks.facebook && (
                        <a
                          href={socialLinks.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-lg bg-muted hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                          aria-label="Facebook"
                        >
                          <Globe className="h-4 w-4 text-muted-foreground" aria-hidden />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Address Card */}
              {(profile.address || profile.city || profile.region) && (
                <motion.div
                  variants={cardVariants}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="border rounded-2xl p-6 bg-background border-border shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-success/10 dark:bg-success/20 border border-success/30 dark:border-success/30">
                      <MapPin className="w-6 h-6 text-success dark:text-success" aria-hidden />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">
                      {t("agentProfile.location")}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {[
                      profile.address,
                      profile.postalCode && profile.city
                        ? `${profile.postalCode} ${profile.city}`
                        : profile.city,
                      profile.region,
                      profile.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </motion.div>
              )}

              {/* License Card */}
              {profile.licenseNumber && (
                <motion.div
                  variants={cardVariants}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="border rounded-2xl p-6 bg-background border-border shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-warning/10 dark:bg-warning/20 border border-warning/30 dark:border-warning/30">
                      <Award className="w-6 h-6 text-warning dark:text-warning" aria-hidden />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">
                      {t("agentProfile.license")}
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-warning flex-shrink-0" />
                      {profile.licenseNumber}
                    </li>
                  </ul>
                </motion.div>
              )}

              {/* Contact Form */}
              {profile.contactFormEnabled && (
                <motion.div variants={cardVariants} id="agency-contact-form">
                  <AgencyContactForm
                    profileSlug={profile.slug}
                    agencyName={profile.name}
                    contactFormFields={parseContactFormFields(profile.contactFormFields)}
                  />
                </motion.div>
              )}
            </motion.div>

            {/* Right Column - Description & Properties */}
            <div className="lg:col-span-2 space-y-8 order-1 lg:order-2">
              {/* Description Card */}
              {profile.description && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98], delay: 0.2 }}
                  className="border-2 rounded-2xl p-6 md:p-8 bg-background border-border"
                >
                  <h2 className="text-xl font-bold text-foreground mb-4">
                    {t("agentProfile.aboutAgency")}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {profile.description}
                  </p>
                </motion.div>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="border-t border-border bg-background"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <Logo size="default" />
              <span className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Oikion
              </span>
              <Link
                href={`/${locale}/changelog`}
                className="group inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all duration-300 ease-out"
              >
                <span className="relative overflow-hidden h-[14px] flex items-center">
                  <span className="inline-flex items-center gap-1 transition-all duration-300 ease-out group-hover:-translate-y-3 group-hover:opacity-0">
                    v{APP_VERSION}
                  </span>
                  <span className="absolute inset-0 inline-flex items-center gap-1 translate-y-3 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                    <ExternalLink className="w-2.5 h-2.5" aria-hidden />
                    Changelog
                  </span>
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-6">
              <Link
                href={`/${locale}/legal/privacy-policy`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t("agentProfile.privacy")}
              </Link>
              <Link
                href={`/${locale}/legal/terms-of-service`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t("agentProfile.terms")}
              </Link>
              <Link
                href={`/${locale}`}
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors inline-flex items-center gap-1"
              >
                {t("agentProfile.learnMore")}
                <ExternalLink className="w-3 h-3" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
