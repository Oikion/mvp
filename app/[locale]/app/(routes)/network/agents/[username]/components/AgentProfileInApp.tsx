"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "lucide-react";
import Image from "next/image";
import { Link } from "@/navigation";
import { useTranslations, useFormatter } from "next-intl";

import { AgentProfileActions } from "./AgentProfileActions";
import { usePresence, toPresenceBorder } from "@/hooks/use-presence";
import { containerVariants, itemVariants, cardVariants } from "@/lib/animation-variants";
import type { InAppAgentProfile } from "@/actions/network/get-agent-profile";

interface AgentProfileInAppProps {
  data: Extract<InAppAgentProfile, { isSelf: false }>;
  locale: string;
}

export function AgentProfileInApp({ data, locale }: AgentProfileInAppProps) {
  const t = useTranslations("profile");
  const format = useFormatter();
  const { getUserStatus } = usePresence();

  const { user, profile, showcaseProperties, connectionStatus, isIncomingRequest, connectionCount, presence } = data;
  const socialLinks = profile.socialLinks;

  // Real-time presence border (falls back to static DB data)
  const presenceBorder = user.id
    ? toPresenceBorder(getUserStatus(user.id) || presence?.status || "OFFLINE")
    : "border-muted-foreground/30";

  const formatPrice = (price: number) =>
    format.number(price, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  const getTransactionTypeLabel = (type: string | null | undefined) => {
    if (type === "SALE") return locale === "el" ? "Πώληση" : "For Sale";
    if (type === "RENTAL") return locale === "el" ? "Ενοικίαση" : "For Rent";
    return type || "";
  };

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center">
              {/* Avatar with presence border */}
              <motion.div variants={itemVariants}>
                <Avatar className={`h-24 w-24 md:h-28 md:w-28 border-[3px] shadow-lg transition-colors ${presenceBorder}`}>
                  <AvatarImage src={user.avatar || ""} alt={user.name || "Agent"} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl md:text-3xl font-bold">
                    {user.name?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              {/* Name */}
              <motion.h1 variants={itemVariants} className="mt-4 text-xl md:text-2xl font-bold tracking-tight text-foreground">
                {user.name}
              </motion.h1>

              {/* Experience */}
              {profile.yearsExperience && (
                <motion.p variants={itemVariants} className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  {t("publicProfile.hero.yearsExperience", { count: profile.yearsExperience })}
                </motion.p>
              )}

              {/* Specializations */}
              {profile.specializations.length > 0 && (
                <motion.div variants={itemVariants} className="flex flex-wrap gap-1.5 mt-3 justify-center">
                  {profile.specializations.map((spec) => (
                    <Badge key={spec} variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs px-2.5 py-0">
                      {spec}
                    </Badge>
                  ))}
                </motion.div>
              )}

              {/* Stats */}
              <motion.div variants={itemVariants} className="flex gap-8 mt-5 text-center">
                <div>
                  <div className="text-xl font-bold text-foreground">{showcaseProperties.length}</div>
                  <div className="text-xs text-muted-foreground">{t("publicProfile.hero.properties")}</div>
                </div>
                <div className="w-px bg-border" aria-hidden="true" />
                <div>
                  <div className="text-xl font-bold text-foreground">{connectionCount}</div>
                  <div className="text-xs text-muted-foreground">{t("publicProfile.hero.followers")}</div>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div variants={itemVariants} className="mt-5">
                <AgentProfileActions
                  targetUserId={user.id}
                  initialConnectionStatus={connectionStatus}
                  isIncomingRequest={isIncomingRequest}
                  username={user.username || ""}
                  locale={locale}
                />
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
          {/* Contact */}
          {(profile.publicEmail || profile.publicPhone || (socialLinks && Object.values(socialLinks).some(Boolean))) && (
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
          )}

          {/* Service Areas */}
          {profile.serviceAreas.length > 0 && (
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
          {profile.languages.length > 0 && (
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
          {profile.certifications.length > 0 && (
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

          {/* Showcase Properties */}
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
              {showcaseProperties.length > 0 && (
                <Badge variant="outline" className="text-xs">{showcaseProperties.length}</Badge>
              )}
            </div>

            {showcaseProperties.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {showcaseProperties.map((property, index) => (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.08, ease: [0.21, 0.47, 0.32, 0.98] }}
                    viewport={{ once: true }}
                  >
                    <Link href={`/app/mls/properties/${property.friendlyId}`} className="block group">
                      <Card className="overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-md">
                        <div className="aspect-[16/10] relative bg-muted">
                          {property.image ? (
                            <Image
                              src={property.image}
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
                            {property.size_net_sqm && (
                              <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" aria-hidden="true" />{property.size_net_sqm} {locale === "el" ? "τ.μ." : "sqm"}</span>
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
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <div className="rounded-full w-16 h-16 bg-muted flex items-center justify-center mx-auto mb-3">
                    <Building2 className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <p className="text-muted-foreground text-sm">{t("publicProfile.sections.noProperties")}</p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
