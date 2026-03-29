"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  Users,
  Home,
  Award,
  Languages,
  Calendar,
  BedDouble,
  Bath,
  Ruler,
  ChevronRight,
  ArrowRight,
  Plus,
  Eye,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useTranslations, useFormatter } from "next-intl";

import { AgentContactForm } from "./AgentContactForm";
import { ProfileActionButtons } from "./ProfileActionButtons";
import type { ContactFormField } from "@/lib/contact-form-types";
import { PublicProfileNav } from "@/components/website/public-profile-nav";
import { PublicProfileFooter } from "@/components/website/public-profile-footer";
import { ShareProfileButton } from "@/components/website/share-profile-button";
import { containerVariants, itemVariants, cardVariants } from "@/lib/animation-variants";

interface AgentProfileViewProps {
  profile: {
    user?: {
      id?: string;
      name?: string | null;
      avatar?: string | null;
      username?: string | null;
      properties?: Array<{
        id: string;
        friendlyId: string;
        property_name: string;
        address_city?: string | null;
        address_state?: string | null;
        bedrooms?: number | null;
        bathrooms?: number | null;
        square_feet?: number | null;
        size_net_sqm?: number | null;
        price?: number | null;
        transaction_type?: string | null;
        linkedDocuments?: Array<{ document_file_url?: string | null }>;
      } | null>;
      _count?: {
        properties?: number;
        followers?: number;
      };
    } | null;
    yearsExperience?: number | null;
    specializations?: string[];
    publicEmail?: string | null;
    publicPhone?: string | null;
    socialLinks?: unknown;
    serviceAreas?: string[];
    languages?: string[];
    certifications?: string[];
    bio?: string | null;
    contactFormEnabled?: boolean;
    contactFormFields?: ContactFormField[];
    presence?: {
      status: string;
      lastSeenAt: Date | string | null;
    } | null;
  };
  locale?: string;
}

export function AgentProfileView({ profile, locale = "en" }: AgentProfileViewProps) {
  const t = useTranslations("profile");
  const format = useFormatter();
  const { user: clerkUser } = useUser();
  const user = profile.user;
  const socialLinks = profile.socialLinks as Record<string, string | undefined> | null | undefined;

  // Detect if the viewer is the profile owner (compare Clerk username to profile username)
  const isOwner = !!(clerkUser?.username && user?.username && clerkUser.username.toLowerCase() === user.username.toLowerCase());

  const formatPrice = (price: number) =>
    format.number(price, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  const getTransactionTypeLabel = (type: string | null | undefined) => {
    if (type === "SALE") return locale === "el" ? "Πώληση" : "For Sale";
    if (type === "RENTAL") return locale === "el" ? "Ενοικίαση" : "For Rent";
    return type || "";
  };

  if (!user) return null;

  const profilePath = `/${locale}/agent/${user.username}`;
  const properties = user.properties?.filter((p): p is NonNullable<typeof p> => p !== null) || [];

  // Compute presence display for the static public profile
  const getPresenceDisplay = () => {
    if (!profile.presence) return null;
    const { status, lastSeenAt } = profile.presence;
    if (status === "ONLINE") return { label: "Online", color: "bg-success" };
    if (status === "AWAY") return { label: locale === "el" ? "Μακριά" : "Away", color: "bg-warning" };
    if (status === "BUSY") return { label: locale === "el" ? "Απασχολημένος" : "Busy", color: "bg-destructive" };
    // OFFLINE — show "Active X ago" if recent
    if (lastSeenAt) {
      const seenDate = new Date(lastSeenAt);
      const minutesAgo = Math.floor((Date.now() - seenDate.getTime()) / 60000);
      if (minutesAgo < 5) return { label: locale === "el" ? "Πρόσφατα ενεργός" : "Just now", color: "bg-success" };
      if (minutesAgo < 60) return { label: locale === "el" ? `Ενεργός ${minutesAgo}λ πριν` : `Active ${minutesAgo}m ago`, color: "bg-muted-foreground" };
      const hoursAgo = Math.floor(minutesAgo / 60);
      if (hoursAgo < 24) return { label: locale === "el" ? `Ενεργός ${hoursAgo}ω πριν` : `Active ${hoursAgo}h ago`, color: "bg-muted-foreground" };
    }
    return { label: "Offline", color: "bg-muted-foreground" };
  };

  const presenceDisplay = getPresenceDisplay();

  return (
    <div className="min-h-screen bg-muted/30 text-foreground flex flex-col">
      <PublicProfileNav locale={locale} />

      {/* Main content — offset for fixed nav (h-16 = 64px) */}
      <main className="flex-1 pt-16 pb-24 lg:pb-8">
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
                  {t("publicProfile.breadcrumb.agents")}
                </Link>
              </li>
              <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
              <li className="text-foreground font-medium truncate max-w-[200px]" aria-current="page">
                {user.name}
              </li>
            </ol>
          </nav>

          {/* Hero Card */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <Card className="overflow-hidden mb-8">
              <CardContent className="pt-8 pb-8 md:pt-10 md:pb-10">
                <div className="flex flex-col items-center text-center">
                  <motion.div variants={itemVariants} className="relative inline-block">
                    <Avatar className="h-28 w-28 md:h-36 md:w-36 border-4 border-primary/20 shadow-lg">
                      <AvatarImage src={user.avatar || ""} alt={user.name || "Agent"} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-3xl md:text-4xl font-bold">
                        {user.name?.charAt(0) || "A"}
                      </AvatarFallback>
                    </Avatar>
                    {presenceDisplay && (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={`absolute bottom-2 right-2 md:bottom-2.5 md:right-2.5 h-5 w-5 md:h-6 md:w-6 rounded-full border-[3px] border-card ${presenceDisplay.color} cursor-default`}
                              aria-label={presenceDisplay.label}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            {presenceDisplay.label}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </motion.div>

                  <motion.h1
                    variants={itemVariants}
                    className="mt-5 text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-gallery"
                  >
                    {user.name}
                  </motion.h1>

                  {profile.yearsExperience && (
                    <motion.p variants={itemVariants} className="mt-2 flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span>{t("publicProfile.hero.yearsExperience", { count: profile.yearsExperience })}</span>
                    </motion.p>
                  )}

                  {profile.specializations && profile.specializations.length > 0 && (
                    <motion.div variants={itemVariants} className="flex flex-wrap gap-2 mt-4 justify-center">
                      {profile.specializations.map((spec) => (
                        <Badge key={spec} variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs px-3 py-0.5">
                          {spec}
                        </Badge>
                      ))}
                    </motion.div>
                  )}

                  {/* Stats row */}
                  <motion.div variants={itemVariants} className="flex gap-8 mt-6 text-center">
                    <div>
                      <div className="text-2xl font-bold text-foreground">{user._count?.properties || 0}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t("publicProfile.hero.properties")}</div>
                    </div>
                    <div className="w-px bg-border" aria-hidden="true" />
                    <div>
                      <div className="text-2xl font-bold text-foreground">{user._count?.followers || 0}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t("publicProfile.hero.followers")}</div>
                    </div>
                  </motion.div>

                  {/* Action buttons + share */}
                  <motion.div variants={itemVariants} className="flex flex-col items-center gap-3 mt-6">
                    {user.username && user.id && (
                      <ProfileActionButtons
                        targetUserId={user.id}
                        locale={locale}
                        profilePath={profilePath}
                        agentName={user.name || "Agent"}
                      />
                    )}
                    <ShareProfileButton url={profilePath} title={user.name || "Agent Profile"} />
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
                    {profile.publicEmail && (
                      <a href={`mailto:${profile.publicEmail}`} className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm">
                        <Mail className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span className="truncate">{profile.publicEmail}</span>
                      </a>
                    )}
                    {profile.publicPhone && (
                      <a href={`tel:${profile.publicPhone}`} className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm">
                        <Phone className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span>{profile.publicPhone}</span>
                      </a>
                    )}
                    {!profile.publicEmail && !profile.publicPhone && (
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

              {/* Service Areas */}
              {profile.serviceAreas && profile.serviceAreas.length > 0 && (
                <motion.div variants={cardVariants}>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-success/10 border border-success/20">
                          <MapPin className="w-5 h-5 text-success" aria-hidden="true" />
                        </div>
                        <CardTitle className="text-base">{t("publicProfile.sections.serviceAreas")}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.serviceAreas.map((area) => (
                          <Badge key={area} variant="outline" className="text-xs">{area}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Languages */}
              {profile.languages && profile.languages.length > 0 && (
                <motion.div variants={cardVariants}>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30">
                          <Languages className="w-5 h-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                        </div>
                        <CardTitle className="text-base">{t("publicProfile.sections.languages")}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.languages.map((lang) => (
                          <Badge key={lang} className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-0 text-xs">{lang}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Certifications */}
              {profile.certifications && profile.certifications.length > 0 && (
                <motion.div variants={cardVariants}>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-warning/10 border border-warning/20">
                          <Award className="w-5 h-5 text-warning" aria-hidden="true" />
                        </div>
                        <CardTitle className="text-base">{t("publicProfile.sections.certifications")}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {profile.certifications.map((cert) => (
                          <li key={cert} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-warning flex-shrink-0" aria-hidden="true" />
                            {cert}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Contact Form */}
              {profile.contactFormEnabled && profile.contactFormFields && profile.contactFormFields.length > 0 && user.username && (
                <motion.div variants={cardVariants}>
                  <AgentContactForm
                    agentUsername={user.username}
                    agentName={user.name || "Agent"}
                    fields={profile.contactFormFields}
                    locale={locale}
                  />
                </motion.div>
              )}
            </motion.div>

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
              {/* Bio */}
              {profile.bio && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
                  viewport={{ once: true }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("publicProfile.sections.aboutMe")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Properties */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
                viewport={{ once: true }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2.5 text-foreground">
                    <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                      <Home className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    {t("publicProfile.sections.properties")}
                  </h2>
                  {properties.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {user._count?.properties || properties.length}
                    </Badge>
                  )}
                </div>

                {properties.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {properties.map((property, index) => (
                        <motion.div
                          key={property.id}
                          initial={{ opacity: 0, y: 15 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.08, ease: [0.21, 0.47, 0.32, 0.98] }}
                          viewport={{ once: true }}
                        >
                          <Link href={`/${locale}/property/${property.friendlyId}`} className="block group">
                            <Card className="overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-md">
                              <div className="aspect-[16/10] relative bg-muted">
                                {property.linkedDocuments?.[0]?.document_file_url ? (
                                  <Image
                                    src={property.linkedDocuments[0].document_file_url}
                                    alt={property.property_name}
                                    fill
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    <Building2 className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
                                  </div>
                                )}
                                {property.transaction_type && (
                                  <Badge className={`absolute top-2.5 left-2.5 text-[11px] shadow-sm ${property.transaction_type === "SALE" ? "bg-success hover:bg-success text-white" : "bg-primary hover:bg-primary text-white"}`}>
                                    {getTransactionTypeLabel(property.transaction_type)}
                                  </Badge>
                                )}
                              </div>
                              <CardContent className="p-4">
                                <h3 className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                                  {property.property_name}
                                </h3>
                                {(property.address_city || property.address_state) && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                                    <span className="truncate">{[property.address_city, property.address_state].filter(Boolean).join(", ")}</span>
                                  </p>
                                )}
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  {property.bedrooms && <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" aria-hidden="true" />{property.bedrooms}</span>}
                                  {property.bathrooms && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" aria-hidden="true" />{property.bathrooms}</span>}
                                  {(property.square_feet || property.size_net_sqm) && (
                                    <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" aria-hidden="true" />{property.size_net_sqm || property.square_feet} {locale === "el" ? "τ.μ." : "sqm"}</span>
                                  )}
                                </div>
                                {property.price && (
                                  <p className="text-lg font-bold text-primary mt-3">{formatPrice(property.price)}</p>
                                )}
                              </CardContent>
                            </Card>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                    {(user._count?.properties || 0) > properties.length && (
                      <div className="mt-6 text-center">
                        <Link href={`/${locale}/agent/${user.username}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                          {t("publicProfile.sections.viewAllProperties")}
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    )}
                  </>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <div className="rounded-full w-16 h-16 bg-muted flex items-center justify-center mx-auto mb-3">
                        <Building2 className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {isOwner
                          ? t("publicProfile.sections.noPropertiesOwner")
                          : t("publicProfile.sections.noProperties")}
                      </p>
                      {isOwner && (
                        <div className="flex items-center justify-center gap-3 mt-4">
                          <Button size="sm" asChild>
                            <Link href={`/${locale}/app/mls/properties`} className="flex items-center gap-1.5">
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                              {t("publicProfile.sections.addProperties")}
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/${locale}/app/mls/properties`} className="flex items-center gap-1.5">
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                              {t("publicProfile.sections.viewMyProperties")}
                            </Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Mobile CTA */}
      {user.username && user.id && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-background/95 backdrop-blur-lg border-t px-4 py-3">
          <ProfileActionButtons
            targetUserId={user.id}
            locale={locale}
            profilePath={profilePath}
            agentName={user.name || "Agent"}
          />
        </div>
      )}

      <PublicProfileFooter locale={locale} />
    </div>
  );
}
