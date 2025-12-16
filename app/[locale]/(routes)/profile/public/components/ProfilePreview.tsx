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
  profile: any;
  dict?: any;
}

export function ProfilePreview({ profile, dict }: ProfilePreviewProps) {
  const t = dict?.profile;
  const user = profile.user;
  const socialLinks = profile.socialLinks as Record<string, string> | null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("el-GR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="rounded-xl overflow-hidden border shadow-sm">
      {/* Preview Banner */}
      <div className="bg-amber-500/10 border-b px-4 py-2 text-center">
        <span className="text-sm text-amber-700 dark:text-amber-400">
          {t?.preview?.previewMode || "Preview Mode - This is how visitors will see your profile"}
        </span>
      </div>

      <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white">
          <div className="absolute inset-0 bg-[url('/images/pattern.png')] opacity-10" />
          <div className="relative max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="h-24 w-24 border-4 border-white/30 shadow-xl">
                <AvatarImage src={user.avatar || ""} alt={user.name || "Agent"} />
                <AvatarFallback className="bg-white/20 text-3xl text-white">
                  {user.name?.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>

              <div className="text-center md:text-left flex-1">
                <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
                {profile.yearsExperience && (
                  <p className="text-blue-100 mt-2 flex items-center justify-center md:justify-start gap-2">
                    <Calendar className="h-4 w-4" />
                    {profile.yearsExperience} {t?.preview?.experience || "years experience"}
                  </p>
                )}

                {/* Specializations */}
                {profile.specializations?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                    {profile.specializations.map((spec: string) => (
                      <Badge
                        key={spec}
                        variant="secondary"
                        className="bg-white/20 text-white hover:bg-white/30 border-0"
                      >
                        {spec}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-4 text-center">
                <div className="bg-white/10 rounded-lg px-5 py-3 backdrop-blur-sm">
                  <div className="text-2xl font-bold">
                    {user._count?.properties || user.properties?.length || 0}
                  </div>
                  <div className="text-blue-100 text-sm">Ακίνητα</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Contact & Info */}
            <div className="space-y-4">
              {/* Contact Card */}
              <Card className="shadow-sm border">
                <CardHeader className="py-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4 text-blue-600" />
                    {t?.contact?.title || "Contact Information"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {profile.publicEmail && (
                    <a
                      href={`mailto:${profile.publicEmail}`}
                      className="flex items-center gap-3 text-muted-foreground hover:text-blue-600 transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      <span className="text-sm">{profile.publicEmail}</span>
                    </a>
                  )}
                  {profile.publicPhone && (
                    <a
                      href={`tel:${profile.publicPhone}`}
                      className="flex items-center gap-3 text-muted-foreground hover:text-blue-600 transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">{profile.publicPhone}</span>
                    </a>
                  )}

                  {/* Social Links */}
                  {socialLinks && Object.keys(socialLinks).some((k) => socialLinks[k]) && (
                    <div className="pt-3 border-t flex gap-2">
                      {socialLinks.linkedin && (
                        <a
                          href={socialLinks.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-full bg-muted hover:bg-blue-500/15 transition-colors"
                        >
                          <Linkedin className="h-4 w-4 text-muted-foreground hover:text-blue-600" />
                        </a>
                      )}
                      {socialLinks.instagram && (
                        <a
                          href={socialLinks.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-full bg-muted hover:bg-pink-100 dark:hover:bg-pink-900 transition-colors"
                        >
                          <Instagram className="h-4 w-4 text-muted-foreground hover:text-pink-600" />
                        </a>
                      )}
                      {socialLinks.twitter && (
                        <a
                          href={socialLinks.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-full bg-muted hover:bg-sky-100 dark:hover:bg-sky-900 transition-colors"
                        >
                          <Twitter className="h-4 w-4 text-muted-foreground hover:text-sky-600" />
                        </a>
                      )}
                      {socialLinks.facebook && (
                        <a
                          href={socialLinks.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-full bg-muted hover:bg-blue-500/15 transition-colors"
                        >
                          <Globe className="h-4 w-4 text-muted-foreground hover:text-blue-600" />
                        </a>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Service Areas */}
              {profile.serviceAreas?.length > 0 && (
                <Card className="shadow-sm border">
                  <CardHeader className="py-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      {t?.expertise?.serviceAreas || "Service Areas"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1">
                      {profile.serviceAreas.map((area: string) => (
                        <Badge key={area} variant="outline" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Languages */}
              {profile.languages?.length > 0 && (
                <Card className="shadow-sm border">
                  <CardHeader className="py-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Languages className="h-4 w-4 text-blue-600" />
                      {t?.expertise?.languages || "Languages"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1">
                      {profile.languages.map((lang: string) => (
                        <Badge key={lang} variant="secondary" className="text-xs">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Certifications */}
              {profile.certifications?.length > 0 && (
                <Card className="shadow-sm border">
                  <CardHeader className="py-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Award className="h-4 w-4 text-blue-600" />
                      {t?.expertise?.certifications || "Certifications"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-1">
                      {profile.certifications.map((cert: string) => (
                        <li
                          key={cert}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <span className="h-1 w-1 rounded-full bg-blue-600" />
                          {cert}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Bio & Properties */}
            <div className="lg:col-span-2 space-y-6">
              {/* Bio */}
              {profile.bio && (
                <Card className="shadow-sm border">
                  <CardHeader className="py-4">
                    <CardTitle className="text-base">{t?.preview?.aboutMe || "About me"}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm">
                      {profile.bio}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Properties */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Home className="h-5 w-5 text-blue-600" />
                    {t?.preview?.properties || "Properties"}
                  </h2>
                  {user.properties?.length > 0 && (
                    <Badge variant="secondary">
                      {user.properties.length} {t?.preview?.propertiesCount || "properties"}
                    </Badge>
                  )}
                </div>

                {user.properties?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {user.properties.map((property: any) => (
                      <Card
                        key={property.id}
                        className="overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="aspect-video relative bg-muted">
                          {property.linkedDocuments?.[0]?.document_file_url ? (
                            <img
                              src={property.linkedDocuments[0].document_file_url}
                              alt={property.property_name}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Building2 className="h-10 w-10 text-muted-foreground/30" />
                            </div>
                          )}
                          {property.transaction_type && (
                            <Badge
                              className="absolute top-2 left-2"
                              variant={
                                property.transaction_type === "SALE"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {property.transaction_type === "SALE"
                                ? (t?.preview?.sale || "Sale")
                                : property.transaction_type === "RENTAL"
                                ? (t?.preview?.rental || "Rental")
                                : property.transaction_type}
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-medium truncate text-sm">
                            {property.property_name}
                          </h3>
                          {(property.address_city || property.address_state) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {[property.address_city, property.address_state]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {property.bedrooms && (
                              <span className="flex items-center gap-1">
                                <BedDouble className="h-3 w-3" />
                                {property.bedrooms}
                              </span>
                            )}
                            {property.bathrooms && (
                              <span className="flex items-center gap-1">
                                <Bath className="h-3 w-3" />
                                {property.bathrooms}
                              </span>
                            )}
                            {(property.square_feet || property.size_net_sqm) && (
                              <span className="flex items-center gap-1">
                                <Ruler className="h-3 w-3" />
                                {property.size_net_sqm || property.square_feet} {t?.preview?.sqm || "sqm"}
                              </span>
                            )}
                          </div>
                          {property.price && (
                            <p className="text-base font-bold text-blue-600 mt-2">
                              {formatPrice(property.price)}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="shadow-sm border">
                    <CardContent className="py-8 text-center">
                      <Building2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground text-sm">
                        {t?.preview?.noShowcaseProperties || "You haven't added properties to your showcase yet."}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t?.preview?.noShowcaseHint || "Add properties from the edit mode."}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-slate-900 text-white py-6 mt-8">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="text-slate-400 text-sm">
              Powered by <span className="text-white font-semibold">Oikion</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}


