"use client";

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
import { Logo } from "@/components/website/logo";
import { APP_VERSION } from "@/lib/version";

interface ProfilePreviewProps {
  profile: {
    user: {
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
      }>;
      _count?: {
        properties?: number;
        followers?: number;
      };
    };
    yearsExperience?: number | null;
    specializations?: string[];
    publicEmail?: string | null;
    publicPhone?: string | null;
    socialLinks?: Record<string, string> | null;
    serviceAreas?: string[];
    languages?: string[];
    certifications?: string[];
    bio?: string | null;
  };
  dict?: {
    profile?: {
      preview?: {
        previewMode?: string;
        experience?: string;
        aboutMe?: string;
        properties?: string;
        propertiesCount?: string;
        sale?: string;
        rental?: string;
        sqm?: string;
        noShowcaseProperties?: string;
        noShowcaseHint?: string;
      };
      contact?: {
        title?: string;
      };
      expertise?: {
        serviceAreas?: string;
        languages?: string;
        certifications?: string;
      };
    };
    common?: {
      poweredBy?: string;
    };
  };
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] },
  },
};

export function ProfilePreview({ profile, dict }: ProfilePreviewProps) {
  const t = dict?.profile;
  const user = profile.user;
  const socialLinks = profile.socialLinks;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("el-GR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getTransactionTypeLabel = (type: string | null | undefined) => {
    if (type === "SALE") return t?.preview?.sale || "Sale";
    if (type === "RENTAL") return t?.preview?.rental || "Rental";
    return type || "";
  };

  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-lg">
      {/* Preview Banner */}
      <div className="bg-warning/10 dark:bg-amber-950/30 border-b border-warning/30 dark:border-amber-900/50 px-4 py-2.5 text-center">
        <span className="text-sm font-medium text-warning dark:text-warning">
          {t?.preview?.previewMode || "Preview Mode - This is how visitors will see your profile"}
        </span>
      </div>

      {/* Main Container */}
      <div className="bg-background text-foreground">
        {/* Navigation Preview */}
        <div className="border-b border-border bg-background/90 backdrop-blur-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <Logo size="default" />
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground px-3 py-1.5 rounded-md border border-border bg-muted/50">
                  Sign In
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="py-12 md:py-16 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center text-center"
            >
              {/* Avatar */}
              <motion.div variants={itemVariants}>
                <Avatar className="h-28 w-28 md:h-32 md:w-32 border-4 border-primary/20 shadow-xl">
                  <AvatarImage src={user.avatar || ""} alt={user.name || "Agent"} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-3xl md:text-4xl font-bold">
                    {user.name?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              {/* Name & Title */}
              <motion.h1
                variants={itemVariants}
                className="mt-5 text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-gallery"
              >
                {user.name}
              </motion.h1>

              {profile.yearsExperience && (
                <motion.p
                  variants={itemVariants}
                  className="mt-2 flex items-center gap-2 text-muted-foreground text-base"
                >
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>
                    {profile.yearsExperience} {t?.preview?.experience || "years experience"}
                  </span>
                </motion.p>
              )}

              {/* Specializations */}
              {profile.specializations && profile.specializations.length > 0 && (
                <motion.div
                  variants={itemVariants}
                  className="flex flex-wrap gap-2 mt-5 justify-center"
                >
                  {profile.specializations.map((spec: string) => (
                    <Badge
                      key={spec}
                      className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-xs px-3 py-0.5"
                    >
                      {spec}
                    </Badge>
                  ))}
                </motion.div>
              )}

              {/* Stats */}
              <motion.div
                variants={itemVariants}
                className="flex gap-5 mt-6"
              >
                <div className="text-center px-5 py-3 rounded-xl bg-muted/50 border border-border">
                  <div className="text-2xl font-bold text-foreground">
                    {user._count?.properties || user.properties?.length || 0}
                  </div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    {t?.preview?.properties || "Properties"}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Content Area */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Contact & Info Cards */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-5 order-2 lg:order-1"
              >
                {/* Contact Card */}
                <motion.div
                  variants={cardVariants}
                  className="border rounded-2xl p-5 bg-background border-border shadow-sm hover:-translate-y-1 transition-transform duration-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/30">
                      <Users className="w-5 h-5 text-primary dark:text-primary" />
                    </div>
                    <h3 className="text-base font-bold text-foreground">
                      {t?.contact?.title || "Contact"}
                    </h3>
                  </div>
                  <div className="space-y-2.5">
                    {profile.publicEmail && (
                      <a
                        href={`mailto:${profile.publicEmail}`}
                        className="flex items-center gap-3 text-muted-foreground hover:text-primary dark:hover:text-primary transition-colors"
                      >
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm truncate">{profile.publicEmail}</span>
                      </a>
                    )}
                    {profile.publicPhone && (
                      <a
                        href={`tel:${profile.publicPhone}`}
                        className="flex items-center gap-3 text-muted-foreground hover:text-primary dark:hover:text-primary transition-colors"
                      >
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">{profile.publicPhone}</span>
                      </a>
                    )}
                    {!profile.publicEmail && !profile.publicPhone && (
                      <p className="text-sm text-muted-foreground italic">
                        No contact information added
                      </p>
                    )}

                    {/* Social Links */}
                    {socialLinks && Object.keys(socialLinks).some((k) => socialLinks[k]) && (
                      <div className="pt-2.5 border-t border-border flex flex-wrap gap-2">
                        {socialLinks.linkedin && (
                          <a
                            href={socialLinks.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-muted hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
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
                            className="p-2 rounded-lg bg-muted hover:bg-pink-100 dark:hover:bg-pink-500/20 transition-colors"
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
                            className="p-2 rounded-lg bg-muted hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors"
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
                            className="p-2 rounded-lg bg-muted hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
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
                    className="border rounded-2xl p-5 bg-background border-border shadow-sm hover:-translate-y-1 transition-transform duration-200"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-success/10 dark:bg-success/20 border border-success/30 dark:border-success/30">
                        <MapPin className="w-5 h-5 text-success dark:text-success" />
                      </div>
                      <h3 className="text-base font-bold text-foreground">
                        {t?.expertise?.serviceAreas || "Service Areas"}
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
                    className="border rounded-2xl p-5 bg-background border-border shadow-sm hover:-translate-y-1 transition-transform duration-200"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30">
                        <Languages className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="text-base font-bold text-foreground">
                        {t?.expertise?.languages || "Languages"}
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
                    className="border rounded-2xl p-5 bg-background border-border shadow-sm hover:-translate-y-1 transition-transform duration-200"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-warning/10 dark:bg-warning/20 border border-warning/30 dark:border-warning/30">
                        <Award className="w-5 h-5 text-warning dark:text-warning" />
                      </div>
                      <h3 className="text-base font-bold text-foreground">
                        {t?.expertise?.certifications || "Certifications"}
                      </h3>
                    </div>
                    <ul className="space-y-1.5">
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
              </motion.div>

              {/* Right Column - Bio & Properties */}
              <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
                {/* Bio Card */}
                {profile.bio && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
                    className="border-2 rounded-2xl p-5 md:p-6 bg-background border-border"
                  >
                    <h2 className="text-lg font-bold text-foreground mb-3">
                      {t?.preview?.aboutMe || "About Me"}
                    </h2>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm">
                      {profile.bio}
                    </p>
                  </motion.div>
                )}

                {/* Properties Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98], delay: 0.1 }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2.5 text-foreground">
                      <div className="p-1.5 rounded-xl bg-primary/10 border border-primary/20">
                        <Home className="h-5 w-5 text-primary" />
                      </div>
                      {t?.preview?.properties || "Properties"}
                    </h2>
                    {user.properties && user.properties.length > 0 && (
                      <Badge className="bg-primary/10 text-primary border border-primary/20">
                        {user.properties.length} {t?.preview?.propertiesCount || "properties"}
                      </Badge>
                    )}
                  </div>

                  {user.properties && user.properties.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {user.properties.map((property, index) => (
                        <motion.div
                          key={property.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.4,
                            delay: index * 0.08,
                            ease: [0.21, 0.47, 0.32, 0.98],
                          }}
                          className="group"
                        >
                          <div className="overflow-hidden rounded-2xl border-2 border-border bg-background hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                            <div className="aspect-[16/10] relative bg-muted">
                              {property.linkedDocuments?.[0]?.document_file_url ? (
                                <img
                                  src={property.linkedDocuments[0].document_file_url}
                                  alt={property.property_name}
                                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <Building2 className="h-10 w-10 text-muted-foreground/50" />
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
                            <div className="p-4">
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
                              <div className="flex items-center gap-4 mt-2.5 text-sm text-muted-foreground">
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
                                    {property.size_net_sqm || property.square_feet} {t?.preview?.sqm || "sqm"}
                                  </span>
                                )}
                              </div>
                              {property.price && (
                                <p className="text-lg font-bold text-primary mt-3">
                                  {formatPrice(property.price)}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="border-2 border-dashed rounded-2xl bg-background border-border"
                    >
                      <div className="py-12 text-center">
                        <div className="rounded-full w-16 h-16 bg-muted flex items-center justify-center mx-auto mb-4">
                          <Building2 className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-foreground font-medium">
                          {t?.preview?.noShowcaseProperties || "No properties added to your showcase."}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t?.preview?.noShowcaseHint || "Add properties from the edit mode."}
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
        <footer className="border-t border-border bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <Logo size="default" />
                <span className="text-sm text-muted-foreground">
                  © {new Date().getFullYear()} Oikion
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  v{APP_VERSION}
                </span>
              </div>

              <div className="flex items-center gap-6">
                <span className="text-sm text-muted-foreground">
                  Privacy
                </span>
                <span className="text-sm text-muted-foreground">
                  Terms
                </span>
                <span className="text-sm text-primary font-medium inline-flex items-center gap-1">
                  Learn more
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
