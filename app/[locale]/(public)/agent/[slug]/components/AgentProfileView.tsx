"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { AgentContactForm } from "./AgentContactForm";
import type { ContactFormField } from "@/actions/social/contact-form";
import { Logo } from "@/components/website/logo";
import { ThemeAndLanguageToggle } from "@/components/website/theme-language-toggle";
import { Button } from "@/components/website/button";
import { GSAPPreloader } from "@/components/website";
import { APP_VERSION } from "@/lib/version";

interface AgentProfileViewProps {
  profile: {
    user?: {
      name?: string | null;
      avatar?: string | null;
      username?: string | null;
      properties?: Array<{
        id: string;
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
  };
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
    transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] },
  },
};

export function AgentProfileView({ profile, locale = "en" }: AgentProfileViewProps) {
  const [preloaderComplete, setPreloaderComplete] = useState(false);
  const user = profile.user;
  const socialLinks = profile.socialLinks as Record<string, string | undefined> | null | undefined;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("el-GR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getTransactionTypeLabel = (type: string | null | undefined) => {
    if (type === "SALE") return locale === "el" ? "Πώληση" : "For Sale";
    if (type === "RENTAL") return locale === "el" ? "Ενοικίαση" : "For Rent";
    return type || "";
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Page Preloader */}
      <GSAPPreloader onComplete={() => setPreloaderComplete(true)} />
      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={preloaderComplete ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href={`/${locale}`}>
              <Logo size="default" />
            </Link>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                asChild
              >
                <Link href={`/${locale}/app/sign-in`}>
                  {locale === "el" ? "Σύνδεση" : "Sign In"}
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
            animate={preloaderComplete ? "visible" : "hidden"}
            className="flex flex-col items-center text-center"
          >
            {/* Avatar */}
            <motion.div variants={itemVariants}>
              <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-primary/20 shadow-xl">
                <AvatarImage src={user.avatar || ""} alt={user.name || "Agent"} />
                <AvatarFallback className="bg-primary text-primary-foreground text-4xl md:text-5xl font-bold">
                  {user.name?.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>
            </motion.div>

            {/* Name & Title */}
            <motion.h1
              variants={itemVariants}
              className="mt-6 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground font-gallery"
            >
              {user.name}
            </motion.h1>

            {profile.yearsExperience && (
              <motion.p
                variants={itemVariants}
                className="mt-3 flex items-center gap-2 text-muted-foreground text-lg"
              >
                <Calendar className="h-5 w-5 text-primary" />
                <span>
                  {profile.yearsExperience} {locale === "el" ? "χρόνια εμπειρίας" : "years experience"}
                </span>
              </motion.p>
            )}

            {/* Specializations */}
            {profile.specializations && profile.specializations.length > 0 && (
              <motion.div
                variants={itemVariants}
                className="flex flex-wrap gap-2 mt-6 justify-center"
              >
                {profile.specializations.map((spec: string) => (
                  <Badge
                    key={spec}
                    className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-sm px-4 py-1"
                  >
                    {spec}
                  </Badge>
                ))}
              </motion.div>
            )}

            {/* Stats */}
            <motion.div
              variants={itemVariants}
              className="flex gap-6 mt-8"
            >
              <div className="text-center px-6 py-4 rounded-2xl bg-muted/50 border border-border">
                <div className="text-3xl font-bold text-foreground">
                  {user._count?.properties || 0}
                </div>
                <div className="text-muted-foreground text-sm mt-1">
                  {locale === "el" ? "Ακίνητα" : "Properties"}
                </div>
              </div>
              <div className="text-center px-6 py-4 rounded-2xl bg-muted/50 border border-border">
                <div className="text-3xl font-bold text-foreground">
                  {user._count?.followers || 0}
                </div>
                <div className="text-muted-foreground text-sm mt-1">
                  {locale === "el" ? "Ακόλουθοι" : "Followers"}
                </div>
              </div>
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
              animate={preloaderComplete ? "visible" : "hidden"}
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
                  <div className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 border border-blue-200 dark:border-primary/30">
                    <Users className="w-6 h-6 text-primary dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {locale === "el" ? "Επικοινωνία" : "Contact"}
                  </h3>
                </div>
                <div className="space-y-3">
                  {profile.publicEmail && (
                    <a
                      href={`mailto:${profile.publicEmail}`}
                      className="flex items-center gap-3 text-muted-foreground hover:text-primary dark:hover:text-blue-400 transition-colors"
                    >
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm truncate">{profile.publicEmail}</span>
                    </a>
                  )}
                  {profile.publicPhone && (
                    <a
                      href={`tel:${profile.publicPhone}`}
                      className="flex items-center gap-3 text-muted-foreground hover:text-primary dark:hover:text-blue-400 transition-colors"
                    >
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">{profile.publicPhone}</span>
                    </a>
                  )}
                  {!profile.publicEmail && !profile.publicPhone && (
                    <p className="text-sm text-muted-foreground italic">
                      {locale === "el"
                        ? "Δεν έχουν προστεθεί στοιχεία επικοινωνίας"
                        : "No contact information added"}
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
                          <Linkedin className="h-4 w-4 text-muted-foreground" />
                        </a>
                      )}
                      {socialLinks.instagram && (
                        <a
                          href={socialLinks.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-lg bg-muted hover:bg-pink-100 dark:hover:bg-pink-500/20 transition-colors"
                          aria-label="Instagram"
                        >
                          <Instagram className="h-4 w-4 text-muted-foreground" />
                        </a>
                      )}
                      {socialLinks.twitter && (
                        <a
                          href={socialLinks.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-lg bg-muted hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors"
                          aria-label="Twitter"
                        >
                          <Twitter className="h-4 w-4 text-muted-foreground" />
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
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Service Areas Card */}
              {profile.serviceAreas && profile.serviceAreas.length > 0 && (
                <motion.div
                  variants={cardVariants}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="border rounded-2xl p-6 bg-background border-border shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-success/10 dark:bg-success/20 border border-green-200 dark:border-success/30">
                      <MapPin className="w-6 h-6 text-success dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">
                      {locale === "el" ? "Περιοχές Εξυπηρέτησης" : "Service Areas"}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.serviceAreas.map((area: string) => (
                      <Badge
                        key={area}
                        variant="outline"
                        className="bg-muted border-border text-foreground"
                      >
                        {area}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Languages Card */}
              {profile.languages && profile.languages.length > 0 && (
                <motion.div
                  variants={cardVariants}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="border rounded-2xl p-6 bg-background border-border shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30">
                      <Languages className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">
                      {locale === "el" ? "Γλώσσες" : "Languages"}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.languages.map((lang: string) => (
                      <Badge
                        key={lang}
                        className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-0"
                      >
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Certifications Card */}
              {profile.certifications && profile.certifications.length > 0 && (
                <motion.div
                  variants={cardVariants}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="border rounded-2xl p-6 bg-background border-border shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-warning/10 dark:bg-warning/20 border border-amber-200 dark:border-warning/30">
                      <Award className="w-6 h-6 text-warning dark:text-amber-400" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">
                      {locale === "el" ? "Πιστοποιήσεις" : "Certifications"}
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {profile.certifications.map((cert: string) => (
                      <li
                        key={cert}
                        className="flex items-center gap-2.5 text-sm text-muted-foreground"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-warning dark:bg-amber-400 flex-shrink-0" />
                        {cert}
                      </li>
                    ))}
                  </ul>
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

            {/* Right Column - Bio & Properties */}
            <div className="lg:col-span-2 space-y-8 order-1 lg:order-2">
              {/* Bio Card */}
              {profile.bio && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={preloaderComplete ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98], delay: 0.2 }}
                  className="border-2 rounded-2xl p-6 md:p-8 bg-background border-border"
                >
                  <h2 className="text-xl font-bold text-foreground mb-4">
                    {locale === "el" ? "Σχετικά με εμένα" : "About Me"}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                </motion.div>
              )}

              {/* Properties Section */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={preloaderComplete ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98], delay: 0.3 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3 text-foreground">
                    <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                      <Home className="h-6 w-6 text-primary" />
                    </div>
                    {locale === "el" ? "Ακίνητα" : "Properties"}
                  </h2>
                  {user.properties && user.properties.length > 0 && (
                    <Badge className="bg-primary/10 text-primary border border-primary/20">
                      {user._count?.properties || user.properties.length}{" "}
                      {locale === "el" ? "ακίνητα" : "properties"}
                    </Badge>
                  )}
                </div>

                {user.properties && user.properties.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {user.properties
                      .filter((p): p is NonNullable<typeof p> => p !== null)
                      .map((property, index) => (
                        <motion.div
                          key={property.id}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.5,
                            delay: index * 0.1,
                            ease: [0.21, 0.47, 0.32, 0.98],
                          }}
                          viewport={{ once: true }}
                          whileHover={{ y: -8, transition: { duration: 0.2 } }}
                        >
                          <Link
                            href={`/${locale}/property/${property.id}`}
                            className="block group"
                          >
                            <div className="overflow-hidden rounded-2xl border-2 border-border bg-background hover:border-primary/50 transition-all duration-300 hover:shadow-xl">
                              <div className="aspect-[16/10] relative bg-muted">
                                {property.linkedDocuments?.[0]?.document_file_url ? (
                                  <img
                                    src={property.linkedDocuments[0].document_file_url}
                                    alt={property.property_name}
                                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    <Building2 className="h-12 w-12 text-muted-foreground/50" />
                                  </div>
                                )}
                                {property.transaction_type && (
                                  <Badge
                                    className={`absolute top-3 left-3 text-xs shadow-lg ${
                                      property.transaction_type === "SALE"
                                        ? "bg-success hover:bg-success text-white"
                                        : "bg-primary hover:bg-primary text-white"
                                    }`}
                                  >
                                    {getTransactionTypeLabel(property.transaction_type)}
                                  </Badge>
                                )}
                              </div>
                              <div className="p-5">
                                <h3 className="font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                                  {property.property_name}
                                </h3>
                                {(property.address_city || property.address_state) && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="truncate">
                                      {[property.address_city, property.address_state]
                                        .filter(Boolean)
                                        .join(", ")}
                                    </span>
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                                  {property.bedrooms && (
                                    <span className="flex items-center gap-1">
                                      <BedDouble className="h-4 w-4" />
                                      {property.bedrooms}
                                    </span>
                                  )}
                                  {property.bathrooms && (
                                    <span className="flex items-center gap-1">
                                      <Bath className="h-4 w-4" />
                                      {property.bathrooms}
                                    </span>
                                  )}
                                  {(property.square_feet || property.size_net_sqm) && (
                                    <span className="flex items-center gap-1">
                                      <Ruler className="h-4 w-4" />
                                      {property.size_net_sqm || property.square_feet}{" "}
                                      {locale === "el" ? "τ.μ." : "sqm"}
                                    </span>
                                  )}
                                </div>
                                {property.price && (
                                  <p className="text-xl font-bold text-primary mt-4">
                                    {formatPrice(property.price)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                    className="border-2 border-dashed rounded-2xl bg-background border-border"
                  >
                    <div className="py-16 text-center">
                      <div className="rounded-full w-20 h-20 bg-muted flex items-center justify-center mx-auto mb-4">
                        <Building2 className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <p className="text-foreground font-medium text-lg">
                        {locale === "el"
                          ? "Δεν υπάρχουν διαθέσιμα ακίνητα αυτή τη στιγμή."
                          : "No properties available at the moment."}
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={preloaderComplete ? { opacity: 1 } : { opacity: 0 }}
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
                    <ExternalLink className="w-2.5 h-2.5" />
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
                {locale === "el" ? "Απόρρητο" : "Privacy"}
              </Link>
              <Link
                href={`/${locale}/legal/terms-of-service`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {locale === "el" ? "Όροι" : "Terms"}
              </Link>
              <Link
                href={`/${locale}`}
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors inline-flex items-center gap-1"
              >
                {locale === "el" ? "Μάθετε περισσότερα" : "Learn more"}
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
