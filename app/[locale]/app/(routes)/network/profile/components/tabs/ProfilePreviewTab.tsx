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

import { containerVariants, itemVariants, cardVariants } from "@/lib/animation-variants";

interface ProfilePreviewTabProps {
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

export function ProfilePreviewTab({ profile, dict }: Readonly<ProfilePreviewTabProps>) {
  const t = dict?.profile;
  const user = profile.user;
  const socialLinks = profile.socialLinks;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(price);

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
      <div className="bg-muted/30 text-foreground">
        {/* Hero Card */}
        <div className="p-4 md:p-6">
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <Card className="overflow-hidden">
              <CardContent className="pt-8 pb-8">
                <div className="flex flex-col items-center text-center">
                  <motion.div variants={itemVariants}>
                    {/* Avatar with presence border (green = "online" for own profile preview) */}
                    <Avatar className="h-28 w-28 md:h-32 md:w-32 border-[3px] border-success shadow-lg">
                      <AvatarImage src={user.avatar || ""} alt={user.name || "Agent"} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-3xl md:text-4xl font-bold">
                        {user.name?.charAt(0) || "A"}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>

                  <motion.h1
                    variants={itemVariants}
                    className="mt-5 text-2xl md:text-3xl font-bold tracking-tight text-foreground font-gallery"
                  >
                    {user.name}
                  </motion.h1>

                  {profile.yearsExperience && (
                    <motion.p variants={itemVariants} className="mt-2 flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span>{profile.yearsExperience} {t?.preview?.experience || "years experience"}</span>
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

                  {/* Stats */}
                  <motion.div variants={itemVariants} className="flex gap-8 mt-6 text-center">
                    <div>
                      <div className="text-2xl font-bold text-foreground">
                        {user._count?.properties || user.properties?.length || 0}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t?.preview?.properties || "Properties"}</div>
                    </div>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Content Grid */}
        <div className="px-4 md:px-6 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
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
                      <CardTitle className="text-base">{t?.contact?.title || "Contact"}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {profile.publicEmail && (
                      <span className="flex items-center gap-3 text-muted-foreground text-sm">
                        <Mail className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span className="truncate">{profile.publicEmail}</span>
                      </span>
                    )}
                    {profile.publicPhone && (
                      <span className="flex items-center gap-3 text-muted-foreground text-sm">
                        <Phone className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span>{profile.publicPhone}</span>
                      </span>
                    )}
                    {!profile.publicEmail && !profile.publicPhone && (
                      <p className="text-sm text-muted-foreground italic">No contact information added</p>
                    )}

                    {socialLinks && Object.keys(socialLinks).some((k) => socialLinks[k]) && (
                      <div className="pt-3 border-t flex flex-wrap gap-2">
                        {socialLinks.linkedin && (
                          <span className="p-2 rounded-lg bg-muted" aria-label="LinkedIn">
                            <Linkedin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          </span>
                        )}
                        {socialLinks.instagram && (
                          <span className="p-2 rounded-lg bg-muted" aria-label="Instagram">
                            <Instagram className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          </span>
                        )}
                        {socialLinks.twitter && (
                          <span className="p-2 rounded-lg bg-muted" aria-label="Twitter">
                            <Twitter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          </span>
                        )}
                        {socialLinks.facebook && (
                          <span className="p-2 rounded-lg bg-muted" aria-label="Facebook">
                            <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          </span>
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
                        <CardTitle className="text-base">{t?.expertise?.serviceAreas || "Service Areas"}</CardTitle>
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
                        <CardTitle className="text-base">{t?.expertise?.languages || "Languages"}</CardTitle>
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
                        <CardTitle className="text-base">{t?.expertise?.certifications || "Certifications"}</CardTitle>
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
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>{t?.preview?.aboutMe || "About Me"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm">{profile.bio}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Properties */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98], delay: 0.1 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2.5 text-foreground">
                    <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                      <Home className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    {t?.preview?.properties || "Properties"}
                  </h2>
                  {user.properties && user.properties.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {user.properties.length}
                    </Badge>
                  )}
                </div>

                {user.properties && user.properties.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {user.properties.map((property, index) => (
                      <motion.div
                        key={property.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.08, ease: [0.21, 0.47, 0.32, 0.98] }}
                      >
                        <Card className="overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-md">
                          <div className="aspect-[16/10] relative bg-muted">
                            {property.linkedDocuments?.[0]?.document_file_url ? (
                              <Image
                                src={property.linkedDocuments[0].document_file_url}
                                alt={property.property_name}
                                fill
                                sizes="(max-width: 640px) 100vw, 50vw"
                                className="object-cover"
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
                            <h3 className="font-semibold text-sm truncate text-foreground">{property.property_name}</h3>
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
                                <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" aria-hidden="true" />{property.size_net_sqm || property.square_feet} {t?.preview?.sqm || "sqm"}</span>
                              )}
                            </div>
                            {property.price && (
                              <p className="text-lg font-bold text-primary mt-3">{formatPrice(property.price)}</p>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <div className="rounded-full w-16 h-16 bg-muted flex items-center justify-center mx-auto mb-3">
                        <Building2 className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                      </div>
                      <p className="text-muted-foreground text-sm">{t?.preview?.noShowcaseProperties || "No properties added to your showcase."}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t?.preview?.noShowcaseHint || "Add properties from the edit mode."}</p>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
