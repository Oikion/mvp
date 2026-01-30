"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  Calendar,
  Home,
  Flame,
  Zap,
  Car,
  Trees,
  Waves,
  ChevronLeft,
  ChevronRight,
  User,
  ExternalLink,
  ThermometerSun,
  Building,
  FileCheck,
} from "lucide-react";
import Link from "next/link";

interface PublicPropertyViewProps {
  property: any;
}

export function PublicPropertyView({ property }: PublicPropertyViewProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = property.linkedDocuments || [];
  const agent = property.assigned_to_user;
  const agentProfile = agent?.agentProfile;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("el-GR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat("el-GR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const transactionTypeLabels: Record<string, string> = {
    SALE: "Πώληση",
    RENTAL: "Ενοικίαση",
    SHORT_TERM: "Βραχυχρόνια Μίσθωση",
    EXCHANGE: "Ανταλλαγή",
  };

  const propertyTypeLabels: Record<string, string> = {
    APARTMENT: "Διαμέρισμα",
    HOUSE: "Μονοκατοικία",
    MAISONETTE: "Μεζονέτα",
    RESIDENTIAL: "Κατοικία",
    COMMERCIAL: "Επαγγελματικό",
    LAND: "Οικόπεδο",
    PLOT: "Αγροτεμάχιο",
    WAREHOUSE: "Αποθήκη",
    PARKING: "Πάρκινγκ",
    VACATION: "Εξοχική Κατοικία",
    OTHER: "Άλλο",
  };

  const heatingTypeLabels: Record<string, string> = {
    AUTONOMOUS: "Αυτόνομη",
    CENTRAL: "Κεντρική",
    NATURAL_GAS: "Φυσικό Αέριο",
    HEAT_PUMP: "Αντλία Θερμότητας",
    ELECTRIC: "Ηλεκτρική",
    NONE: "Χωρίς",
  };

  const conditionLabels: Record<string, string> = {
    EXCELLENT: "Άριστη",
    VERY_GOOD: "Πολύ Καλή",
    GOOD: "Καλή",
    NEEDS_RENOVATION: "Χρήζει Ανακαίνισης",
  };

  const furnishedLabels: Record<string, string> = {
    NO: "Χωρίς Επίπλωση",
    PARTIALLY: "Ημιεπιπλωμένο",
    FULLY: "Πλήρως Επιπλωμένο",
  };

  const amenities = (property.amenities as string[]) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Image Gallery */}
      <div className="relative bg-black">
        {images.length > 0 ? (
          <div className="relative aspect-[21/9] max-h-[500px]">
            <img
              src={images[currentImageIndex].document_file_url}
              alt={property.property_name}
              className="w-full h-full object-cover"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === currentImageIndex
                          ? "bg-white"
                          : "bg-white/50 hover:bg-white/70"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="aspect-[21/9] max-h-[500px] flex items-center justify-center bg-muted">
            <Building2 className="h-24 w-24 text-gray-300" />
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="bg-gray-900 py-2 px-4 overflow-x-auto">
          <div className="flex gap-2 justify-center">
            {images.slice(0, 8).map((img: any, idx: number) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={`flex-shrink-0 w-20 h-14 rounded overflow-hidden border-2 transition-all ${
                  idx === currentImageIndex
                    ? "border-primary"
                    : "border-transparent hover:border-gray-500"
                }`}
              >
                <img
                  src={img.document_file_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Property Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {property.transaction_type && (
                  <Badge
                    variant={
                      property.transaction_type === "SALE" ? "default" : "secondary"
                    }
                    className="text-sm"
                  >
                    {transactionTypeLabels[property.transaction_type] ||
                      property.transaction_type}
                  </Badge>
                )}
                {property.property_type && (
                  <Badge variant="outline" className="text-sm">
                    {propertyTypeLabels[property.property_type] ||
                      property.property_type}
                  </Badge>
                )}
                {property.is_exclusive && (
                  <Badge className="bg-warning hover:bg-warning text-sm">
                    Αποκλειστική
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {property.property_name}
              </h1>
              {(property.address_city ||
                property.municipality ||
                property.area) && (
                <p className="text-muted-foreground flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" />
                  {[property.area, property.municipality, property.address_city]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              {property.price && (
                <p className="text-4xl font-bold text-primary mt-4">
                  {formatPrice(property.price)}
                  {property.transaction_type === "RENTAL" && (
                    <span className="text-lg font-normal text-muted-foreground">/μήνα</span>
                  )}
                </p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {property.bedrooms && (
                <Card className="shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <BedDouble className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{property.bedrooms}</p>
                      <p className="text-sm text-muted-foreground">Υπνοδωμάτια</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {property.bathrooms && (
                <Card className="shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Bath className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{property.bathrooms}</p>
                      <p className="text-sm text-muted-foreground">Μπάνια</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {(property.size_net_sqm || property.square_feet) && (
                <Card className="shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Ruler className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">
                        {property.size_net_sqm || property.square_feet}
                      </p>
                      <p className="text-sm text-muted-foreground">τ.μ.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {property.year_built && (
                <Card className="shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{property.year_built}</p>
                      <p className="text-sm text-muted-foreground">Έτος Κατ.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Description */}
            {property.description && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle>Περιγραφή</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {property.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Property Details */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" />
                  Χαρακτηριστικά Ακινήτου
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {property.floor && (
                    <DetailRow
                      icon={<Building className="h-4 w-4" />}
                      label="Όροφος"
                      value={property.floor}
                    />
                  )}
                  {property.floors_total && (
                    <DetailRow
                      icon={<Building className="h-4 w-4" />}
                      label="Σύνολο Ορόφων"
                      value={property.floors_total}
                    />
                  )}
                  {property.size_gross_sqm && (
                    <DetailRow
                      icon={<Ruler className="h-4 w-4" />}
                      label="Μικτά τ.μ."
                      value={`${property.size_gross_sqm} τ.μ.`}
                    />
                  )}
                  {property.plot_size_sqm && (
                    <DetailRow
                      icon={<Trees className="h-4 w-4" />}
                      label="Οικόπεδο"
                      value={`${property.plot_size_sqm} τ.μ.`}
                    />
                  )}
                  {property.heating_type && (
                    <DetailRow
                      icon={<ThermometerSun className="h-4 w-4" />}
                      label="Θέρμανση"
                      value={
                        heatingTypeLabels[property.heating_type] ||
                        property.heating_type
                      }
                    />
                  )}
                  {property.energy_cert_class && (
                    <DetailRow
                      icon={<Zap className="h-4 w-4" />}
                      label="Ενεργειακή Κλάση"
                      value={property.energy_cert_class}
                    />
                  )}
                  {property.condition && (
                    <DetailRow
                      icon={<FileCheck className="h-4 w-4" />}
                      label="Κατάσταση"
                      value={
                        conditionLabels[property.condition] || property.condition
                      }
                    />
                  )}
                  {property.furnished && (
                    <DetailRow
                      icon={<Home className="h-4 w-4" />}
                      label="Επίπλωση"
                      value={
                        furnishedLabels[property.furnished] || property.furnished
                      }
                    />
                  )}
                  {property.elevator !== undefined && property.elevator !== null && (
                    <DetailRow
                      icon={<Building className="h-4 w-4" />}
                      label="Ασανσέρ"
                      value={property.elevator ? "Ναι" : "Όχι"}
                    />
                  )}
                  {property.renovated_year && (
                    <DetailRow
                      icon={<Calendar className="h-4 w-4" />}
                      label="Έτος Ανακαίνισης"
                      value={property.renovated_year}
                    />
                  )}
                  {property.monthly_common_charges && (
                    <DetailRow
                      icon={<Building className="h-4 w-4" />}
                      label="Κοινόχρηστα"
                      value={`€${property.monthly_common_charges}/μήνα`}
                    />
                  )}
                  {property.available_from && (
                    <DetailRow
                      icon={<Calendar className="h-4 w-4" />}
                      label="Διαθέσιμο από"
                      value={formatDate(property.available_from)}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Amenities */}
            {amenities.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle>Παροχές</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {amenities.map((amenity: string) => (
                      <Badge key={amenity} variant="secondary" className="text-sm py-1">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Agent Info */}
          <div className="space-y-6">
            {/* Agent Card */}
            {agent && (
              <Card className="shadow-lg border-0 sticky top-6">
                <CardHeader>
                  <CardTitle className="text-lg">Επικοινωνήστε μαζί μας</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={agent.avatar || ""} alt={agent.name || ""} />
                      <AvatarFallback className="bg-primary/15 text-primary dark:text-blue-400 text-xl">
                        {agent.name?.charAt(0) || <User className="h-6 w-6" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{agent.name}</h3>
                      <p className="text-sm text-muted-foreground">Μεσίτης Ακινήτων</p>
                    </div>
                  </div>

                  <Separator />

                  {agentProfile?.publicPhone && (
                    <a
                      href={`tel:${agentProfile.publicPhone}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 hover:bg-primary/15 transition-colors"
                    >
                      <Phone className="h-5 w-5 text-primary" />
                      <span className="font-medium text-primary">
                        {agentProfile.publicPhone}
                      </span>
                    </a>
                  )}

                  {agentProfile?.publicEmail && (
                    <a
                      href={`mailto:${agentProfile.publicEmail}?subject=Ενδιαφέρομαι για: ${property.property_name}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted transition-colors"
                    >
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <span className="text-muted-foreground">Αποστολή Email</span>
                    </a>
                  )}

                  {agentProfile?.visibility !== "PERSONAL" && agentProfile?.slug && (
                    <Link
                      href={`/agent/${agentProfile.slug}`}
                      className="flex items-center justify-center gap-2 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-gray-700"
                    >
                      <User className="h-5 w-5" />
                      <span>Προφίλ Μεσίτη</span>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Property Reference */}
            <Card className="shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Κωδικός Ακινήτου</p>
                <p className="font-mono font-semibold text-gray-700">
                  {property.id.slice(0, 8).toUpperCase()}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            Powered by{" "}
            <span className="text-white font-semibold">Oikion</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-primary">{icon}</span>
      <span className="text-muted-foreground flex-1">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

