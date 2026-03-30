"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Users,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AgencyContactForm } from "./AgencyContactForm";
import { AgencyActionButtons } from "./AgencyActionButtons";
import { PublicProfileNav } from "@/components/website/public-profile-nav";
import { PublicProfileFooter } from "@/components/website/public-profile-footer";
import { ShareProfileButton } from "@/components/website/share-profile-button";
import { containerVariants, itemVariants, cardVariants } from "@/lib/animation-variants";
import { parseContactFormFields } from "@/lib/contact-form-types";

type AgencyProfile = NonNullable<
  Awaited<ReturnType<typeof import("@/actions/organization/agency-profile").getPublicAgencyProfile>>
>;

interface AgencyProfileViewProps {
  profile: AgencyProfile;
  locale?: string;
}

export function AgencyProfileView({ profile, locale = "en" }: AgencyProfileViewProps) {
  const t = useTranslations("profile");
  const socialLinks = profile.socialLinks as Record<string, string | undefined> | null | undefined;
  const profilePath = `/${locale}/agency/${profile.slug}`;

  return (
    <div className="min-h-screen bg-muted/30 text-foreground flex flex-col">
      <PublicProfileNav locale={locale} />

      <main className="flex-1 pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav aria-label="breadcrumb" className="py-4">
            <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <li>
                <Link href={`/${locale}`} className="hover:text-primary transition-colors">
                  {t("publicProfile.breadcrumb.home")}
                </Link>
              </li>
              <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
              <li>
                <Link href={`/${locale}`} className="hover:text-primary transition-colors">
                  {t("publicProfile.breadcrumb.agencies")}
                </Link>
              </li>
              <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
              <li className="text-foreground font-medium truncate max-w-[200px]" aria-current="page">
                {profile.name}
              </li>
            </ol>
          </nav>

          {/* Hero Card */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <Card className="overflow-hidden mb-8">
              <CardContent className="pt-8 pb-8 md:pt-10 md:pb-10">
                <div className="flex flex-col items-center text-center">
                  <motion.div variants={itemVariants}>
                    {profile.logo ? (
                      <div className="relative h-28 w-28 md:h-36 md:w-36 overflow-hidden rounded-2xl border-4 border-primary/20 shadow-lg bg-muted">
                        <Image
                          src={profile.logo}
                          alt={profile.name}
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 112px, 144px"
                        />
                      </div>
                    ) : (
                      <div className="h-28 w-28 md:h-36 md:w-36 rounded-2xl border-4 border-primary/20 shadow-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-14 w-14 md:h-16 md:w-16 text-primary" aria-hidden="true" />
                      </div>
                    )}
                  </motion.div>

                  <motion.h1
                    variants={itemVariants}
                    className="mt-5 text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-gallery"
                  >
                    {profile.name}
                  </motion.h1>

                  {profile.yearFounded && (
                    <motion.p variants={itemVariants} className="mt-2 flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span>{t("publicProfile.hero.founded")} {profile.yearFounded}</span>
                    </motion.p>
                  )}

                  {(profile.city || profile.region) && (
                    <motion.div variants={itemVariants} className="mt-3">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs px-3 py-0.5">
                        <MapPin className="h-3 w-3 mr-1" aria-hidden="true" />
                        {[profile.city, profile.region].filter(Boolean).join(", ")}
                      </Badge>
                    </motion.div>
                  )}

                  <motion.div variants={itemVariants} className="flex flex-col items-center gap-3 mt-6">
                    <AgencyActionButtons
                      locale={locale}
                      profilePath={profilePath}
                      onCollaborate={() => {
                        const el = document.getElementById("agency-contact-form");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                    />
                    <ShareProfileButton url={profilePath} title={profile.name} />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-6 order-2 lg:order-1"
            >
              {/* Contact Card */}
              <motion.div variants={cardVariants}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
                        <Users className="w-5 h-5 text-primary" aria-hidden="true" />
                      </div>
                      <CardTitle className="text-base">{t("publicProfile.sections.contact")}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {profile.email && (
                      <a href={`mailto:${profile.email}`} className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm">
                        <Mail className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span className="truncate">{profile.email}</span>
                      </a>
                    )}
                    {profile.phone && (
                      <a href={`tel:${profile.phone}`} className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm">
                        <Phone className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span>{profile.phone}</span>
                      </a>
                    )}
                    {profile.website && (
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm">
                        <Globe className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span className="truncate">{profile.website}</span>
                      </a>
                    )}
                    {!profile.email && !profile.phone && !profile.website && (
                      <p className="text-sm text-muted-foreground italic">{t("publicProfile.sections.noContactInfo")}</p>
                    )}

                    {socialLinks && Object.keys(socialLinks).some((k) => socialLinks[k]) && (
                      <div className="pt-3 border-t flex flex-wrap gap-2">
                        {socialLinks.linkedin && (
                          <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted hover:bg-primary/10 transition-colors" aria-label="LinkedIn">
                            <Linkedin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          </a>
                        )}
                        {socialLinks.instagram && (
                          <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted hover:bg-pink-100 dark:hover:bg-pink-500/20 transition-colors" aria-label="Instagram">
                            <Instagram className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          </a>
                        )}
                        {socialLinks.twitter && (
                          <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors" aria-label="Twitter">
                            <Twitter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          </a>
                        )}
                        {socialLinks.facebook && (
                          <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted hover:bg-primary/10 transition-colors" aria-label="Facebook">
                            <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Address */}
              {(profile.address || profile.city || profile.region) && (
                <motion.div variants={cardVariants}>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-success/10 border border-success/20">
                          <MapPin className="w-5 h-5 text-success" aria-hidden="true" />
                        </div>
                        <CardTitle className="text-base">{t("publicProfile.sections.location")}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {[profile.address, profile.postalCode && profile.city ? `${profile.postalCode} ${profile.city}` : profile.city, profile.region, profile.country].filter(Boolean).join(", ")}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* License */}
              {profile.licenseNumber && (
                <motion.div variants={cardVariants}>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-warning/10 border border-warning/20">
                          <Award className="w-5 h-5 text-warning" aria-hidden="true" />
                        </div>
                        <CardTitle className="text-base">{t("publicProfile.sections.license")}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{profile.licenseNumber}</p>
                    </CardContent>
                  </Card>
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

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
              {profile.description && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
                  viewport={{ once: true }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("publicProfile.sections.aboutAgency")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{profile.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>

      <PublicProfileFooter locale={locale} />
    </div>
  );
}
