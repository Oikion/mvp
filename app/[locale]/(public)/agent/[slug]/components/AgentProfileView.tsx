"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import Link from "next/link";

interface AgentProfileViewProps {
  profile: any;
}

export function AgentProfileView({ profile }: AgentProfileViewProps) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-800 dark:via-blue-900 dark:to-indigo-950 text-white">
        <div className="absolute inset-0 bg-[url('/images/pattern.png')] opacity-10" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <Avatar className="h-32 w-32 border-4 border-white/30 shadow-2xl">
              <AvatarImage src={user.avatar || ""} alt={user.name || "Agent"} />
              <AvatarFallback className="bg-white/20 text-4xl text-white">
                {user.name?.charAt(0) || "A"}
              </AvatarFallback>
            </Avatar>

            <div className="text-center md:text-left flex-1">
              <h1 className="text-4xl font-bold tracking-tight">{user.name}</h1>
              {profile.yearsExperience && (
                <p className="text-blue-100 mt-2 flex items-center justify-center md:justify-start gap-2">
                  <Calendar className="h-4 w-4" />
                  {profile.yearsExperience} χρόνια εμπειρίας
                </p>
              )}

              {/* Specializations */}
              {profile.specializations?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
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
            <div className="flex gap-6 text-center">
              <div className="bg-white/10 rounded-lg px-6 py-4 backdrop-blur-sm">
                <div className="text-3xl font-bold">
                  {user._count?.properties || 0}
                </div>
                <div className="text-blue-100 text-sm">Ακίνητα</div>
              </div>
              <div className="bg-white/10 rounded-lg px-6 py-4 backdrop-blur-sm">
                <div className="text-3xl font-bold">
                  {user._count?.followers || 0}
                </div>
                <div className="text-blue-100 text-sm">Ακόλουθοι</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Contact & Info */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card className="shadow-lg border-0 dark:bg-slate-900/50 dark:border dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Επικοινωνία
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.publicEmail && (
                  <a
                    href={`mailto:${profile.publicEmail}`}
                    className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <Mail className="h-5 w-5" />
                    <span className="text-sm">{profile.publicEmail}</span>
                  </a>
                )}
                {profile.publicPhone && (
                  <a
                    href={`tel:${profile.publicPhone}`}
                    className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <Phone className="h-5 w-5" />
                    <span className="text-sm">{profile.publicPhone}</span>
                  </a>
                )}

                {/* Social Links */}
                {socialLinks && Object.keys(socialLinks).length > 0 && (
                  <div className="pt-4 border-t dark:border-slate-700 flex gap-3">
                    {socialLinks.linkedin && (
                      <a
                        href={socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        <Linkedin className="h-5 w-5 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400" />
                      </a>
                    )}
                    {socialLinks.instagram && (
                      <a
                        href={socialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-pink-100 dark:hover:bg-pink-900/50 transition-colors"
                      >
                        <Instagram className="h-5 w-5 text-gray-600 dark:text-gray-300 hover:text-pink-600 dark:hover:text-pink-400" />
                      </a>
                    )}
                    {socialLinks.twitter && (
                      <a
                        href={socialLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
                      >
                        <Twitter className="h-5 w-5 text-gray-600 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400" />
                      </a>
                    )}
                    {socialLinks.facebook && (
                      <a
                        href={socialLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        <Globe className="h-5 w-5 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400" />
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service Areas */}
            {profile.serviceAreas?.length > 0 && (
              <Card className="shadow-lg border-0 dark:bg-slate-900/50 dark:border dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Περιοχές Εξυπηρέτησης
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.serviceAreas.map((area: string) => (
                      <Badge key={area} variant="outline">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Languages */}
            {profile.languages?.length > 0 && (
              <Card className="shadow-lg border-0 dark:bg-slate-900/50 dark:border dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Languages className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Γλώσσες
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.languages.map((lang: string) => (
                      <Badge key={lang} variant="secondary">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certifications */}
            {profile.certifications?.length > 0 && (
              <Card className="shadow-lg border-0 dark:bg-slate-900/50 dark:border dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Πιστοποιήσεις
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {profile.certifications.map((cert: string) => (
                      <li
                        key={cert}
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                        {cert}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Bio & Properties */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bio */}
            {profile.bio && (
              <Card className="shadow-lg border-0 dark:bg-slate-900/50 dark:border dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Σχετικά με εμένα</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Properties */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Home className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  Ακίνητα
                </h2>
                {user.properties?.length > 0 && (
                  <Badge variant="secondary" className="text-sm">
                    {user._count?.properties || user.properties.length} ακίνητα
                  </Badge>
                )}
              </div>

              {user.properties?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {user.properties.map((property: any) => (
                    <Link
                      key={property.id}
                      href={`/property/${property.id}`}
                      className="block"
                    >
                      <Card className="overflow-hidden hover:shadow-xl transition-shadow border-0 shadow-lg dark:bg-slate-900/50 dark:border dark:border-slate-800 dark:hover:border-slate-700">
                        <div className="aspect-video relative bg-gray-100 dark:bg-slate-800">
                          {property.linkedDocuments?.[0]?.document_file_url ? (
                            <img
                              src={property.linkedDocuments[0].document_file_url}
                              alt={property.property_name}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Building2 className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                            </div>
                          )}
                          {property.transaction_type && (
                            <Badge
                              className="absolute top-3 left-3"
                              variant={
                                property.transaction_type === "SALE"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {property.transaction_type === "SALE"
                                ? "Πώληση"
                                : property.transaction_type === "RENTAL"
                                ? "Ενοικίαση"
                                : property.transaction_type}
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {property.property_name}
                          </h3>
                          {(property.address_city || property.address_state) && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {[property.address_city, property.address_state]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-3 text-sm text-gray-500 dark:text-gray-400">
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
                                {property.size_net_sqm || property.square_feet} τ.μ.
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
                    </Link>
                  ))}
                </div>
              ) : (
                <Card className="shadow-lg border-0 dark:bg-slate-900/50 dark:border dark:border-slate-800">
                  <CardContent className="py-12 text-center">
                    <Building2 className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Δεν υπάρχουν διαθέσιμα ακίνητα αυτή τη στιγμή.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-slate-950 text-white py-8 mt-16 border-t border-gray-800 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            Powered by{" "}
            <span className="text-white font-semibold">Oikion</span>
          </p>
        </div>
      </footer>
    </div>
  );
}


