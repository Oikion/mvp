"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
      <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 px-4 py-2.5 text-center">
        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
          {t?.preview?.previewMode || "Preview Mode - This is how visitors will see your profile"}
        </span>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900">
        {/* Hero Section - Professional gradient */}
        <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 dark:from-slate-900 dark:via-slate-950 dark:to-black">
          {/* Decorative elements */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-transparent to-indigo-600/10" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
          
          <div className="relative max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8">
              {/* Avatar */}
              <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-white/20 shadow-2xl ring-4 ring-blue-500/20">
                <AvatarImage src={user.avatar || ""} alt={user.name || "Agent"} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-3xl sm:text-4xl text-white font-bold">
                  {user.name?.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="text-center sm:text-left flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
                  {user.name}
                </h1>
                {profile.yearsExperience && (
                  <p className="text-slate-300 mt-2 flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base">
                    <Calendar className="h-4 w-4 flex-shrink-0 text-blue-400" />
                    <span>{profile.yearsExperience} {t?.preview?.experience || "years experience"}</span>
                  </p>
                )}

                {/* Specializations */}
                {profile.specializations && profile.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
                    {profile.specializations.map((spec: string) => (
                      <Badge
                        key={spec}
                        className="bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 border border-blue-500/30 text-xs sm:text-sm"
                      >
                        {spec}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-4 text-center mt-4 sm:mt-0">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl px-5 sm:px-6 py-3 sm:py-4 border border-white/10">
                  <div className="text-2xl sm:text-3xl font-bold text-white">
                    {user._count?.properties || user.properties?.length || 0}
                  </div>
                  <div className="text-slate-400 text-xs sm:text-sm mt-0.5">{t?.preview?.properties || "Ακίνητα"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-slate-50 dark:bg-slate-900/50">
          <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Left Column - Contact & Info */}
              <div className="space-y-5 order-2 lg:order-1">
                {/* Contact Card */}
                <Card className="shadow-sm bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-slate-900 dark:text-slate-100">
                      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      {t?.contact?.title || "Στοιχεία Επικοινωνίας"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {profile.publicEmail && (
                      <a
                        href={`mailto:${profile.publicEmail}`}
                        className="flex items-center gap-3 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                      >
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm truncate">{profile.publicEmail}</span>
                      </a>
                    )}
                    {profile.publicPhone && (
                      <a
                        href={`tel:${profile.publicPhone}`}
                        className="flex items-center gap-3 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                      >
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">{profile.publicPhone}</span>
                      </a>
                    )}

                    {/* Show empty state if no contact info */}
                    {!profile.publicEmail && !profile.publicPhone && (
                      <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                        No contact information added
                      </p>
                    )}

                    {/* Social Links */}
                    {socialLinks && Object.keys(socialLinks).some((k) => socialLinks[k]) && (
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-2">
                        {socialLinks.linkedin && (
                          <a
                            href={socialLinks.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            aria-label="LinkedIn"
                          >
                            <Linkedin className="h-4 w-4 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400" />
                          </a>
                        )}
                        {socialLinks.instagram && (
                          <a
                            href={socialLinks.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors"
                            aria-label="Instagram"
                          >
                            <Instagram className="h-4 w-4 text-slate-600 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-400" />
                          </a>
                        )}
                        {socialLinks.twitter && (
                          <a
                            href={socialLinks.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors"
                            aria-label="Twitter"
                          >
                            <Twitter className="h-4 w-4 text-slate-600 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400" />
                          </a>
                        )}
                        {socialLinks.facebook && (
                          <a
                            href={socialLinks.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            aria-label="Facebook"
                          >
                            <Globe className="h-4 w-4 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400" />
                          </a>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Service Areas */}
                {profile.serviceAreas && profile.serviceAreas.length > 0 && (
                  <Card className="shadow-sm bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-slate-900 dark:text-slate-100">
                        <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                          <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        {t?.expertise?.serviceAreas || "Περιοχές Εξυπηρέτησης"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {profile.serviceAreas.map((area: string) => (
                          <Badge 
                            key={area} 
                            variant="outline" 
                            className="bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                          >
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Languages */}
                {profile.languages && profile.languages.length > 0 && (
                  <Card className="shadow-sm bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-slate-900 dark:text-slate-100">
                        <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                          <Languages className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        {t?.expertise?.languages || "Γλώσσες"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {profile.languages.map((lang: string) => (
                          <Badge 
                            key={lang} 
                            className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-0"
                          >
                            {lang}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Certifications */}
                {profile.certifications && profile.certifications.length > 0 && (
                  <Card className="shadow-sm bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-slate-900 dark:text-slate-100">
                        <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                          <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        {t?.expertise?.certifications || "Πιστοποιήσεις"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {profile.certifications.map((cert: string) => (
                          <li
                            key={cert}
                            className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                            {cert}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Properties */}
              <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
                {/* Bio */}
                {profile.bio && (
                  <Card className="shadow-sm bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {t?.preview?.aboutMe || "Σχετικά με εμένα"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">
                        {profile.bio}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Properties Section */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2.5 text-slate-900 dark:text-slate-100">
                      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <Home className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      {t?.preview?.properties || "Ακίνητα"}
                    </h2>
                    {user.properties && user.properties.length > 0 && (
                      <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-0">
                        {user.properties.length} {t?.preview?.propertiesCount || "ακίνητα"}
                      </Badge>
                    )}
                  </div>

                  {user.properties && user.properties.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {user.properties.map((property) => (
                        <Card
                          key={property.id}
                          className="overflow-hidden hover:shadow-lg transition-all duration-200 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-700"
                        >
                          <div className="aspect-[16/10] relative bg-slate-100 dark:bg-slate-800">
                            {property.linkedDocuments?.[0]?.document_file_url ? (
                              <img
                                src={property.linkedDocuments[0].document_file_url}
                                alt={property.property_name}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <Building2 className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                              </div>
                            )}
                            {property.transaction_type && (
                              <Badge
                                className={`absolute top-3 left-3 text-xs shadow-lg ${
                                  property.transaction_type === "SALE"
                                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                                    : "bg-blue-500 hover:bg-blue-600 text-white"
                                }`}
                              >
                                {getTransactionTypeLabel(property.transaction_type)}
                              </Badge>
                            )}
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold truncate text-slate-900 dark:text-slate-100">
                              {property.property_name}
                            </h3>
                            {(property.address_city || property.address_state) && (
                              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">
                                  {[property.address_city, property.address_state]
                                    .filter(Boolean)
                                    .join(", ")}
                                </span>
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-3 text-sm text-slate-500 dark:text-slate-400">
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
                                  {property.size_net_sqm || property.square_feet} {t?.preview?.sqm || "τ.μ."}
                                </span>
                              )}
                            </div>
                            {property.price && (
                              <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-3">
                                {formatPrice(property.price)}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="shadow-sm bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 border-dashed">
                      <CardContent className="py-12 text-center">
                        <div className="rounded-full w-16 h-16 bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                          <Building2 className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 font-medium">
                          {t?.preview?.noShowcaseProperties || "Δεν έχετε προσθέσει ακίνητα στην προβολή σας."}
                        </p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                          {t?.preview?.noShowcaseHint || "Προσθέστε ακίνητα από τη λειτουργία επεξεργασίας."}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-slate-900 dark:bg-black border-t border-slate-800 py-6">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <p className="text-slate-400 text-sm">
              Powered by <span className="text-white font-semibold">Oikion</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
