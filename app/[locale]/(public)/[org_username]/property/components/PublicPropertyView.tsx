"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Home, Bed, Bath, Maximize } from "lucide-react";
import Image from "next/image";

interface PublicPropertyViewProps {
  property: {
    id: string;
    friendlyId: string;
    slug?: string;
    property_name: string;
    property_type?: string | null;
    property_status?: string | null;
    portal_visibility?: string | null;
    price?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    size_net_sqm?: number | null;
    lot_size?: number | null;
    year_built?: number | null;
    description?: string | null;
    address_street?: string | null;
    address_city?: string | null;
    address_state?: string | null;
    address_zip?: string | null;
    municipality?: string | null;
    assigned_to_user?: {
      name?: string | null;
      avatar?: string | null;
      username?: string | null;
      agentProfile?: {
        slug?: string | null;
        publicPhone?: string | null;
        publicEmail?: string | null;
        visibility?: string | null;
      } | null;
    } | null;
    linkedDocuments?: Array<{
      id: string;
      document_file_url: string;
      document_name?: string | null;
    }>;
    organization?: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

export function PublicPropertyView({ property }: PublicPropertyViewProps) {
  const formatPrice = (price: number | null | undefined) => {
    if (!price) return "Price on request";
    return new Intl.NumberFormat("el-GR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const images = property.linkedDocuments || [];
  const agent = property.assigned_to_user;
  const agentProfile = agent?.agentProfile;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Hero Image Gallery */}
      {images.length > 0 && (
        <div className="mb-8">
          <div className="relative h-[500px] w-full rounded-lg overflow-hidden">
            <Image
              src={images[0].document_file_url}
              alt={property.property_name}
              fill
              className="object-cover"
              priority
            />
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {images.slice(1, 5).map((img) => (
                <div key={img.id} className="relative h-24 rounded overflow-hidden">
                  <Image
                    src={img.document_file_url}
                    alt={img.document_name || "Property image"}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title and Price */}
          <div>
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-3xl font-bold">{property.property_name}</h1>
              <Badge variant="secondary">{property.property_type}</Badge>
            </div>
            <p className="text-3xl font-bold text-primary mb-4">
              {formatPrice(property.price)}
            </p>
            <div className="flex items-center text-muted-foreground gap-2">
              <MapPin className="h-4 w-4" />
              <span>
                {[property.address_street, property.address_city, property.municipality]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          </div>

          {/* Key Features */}
          <Card>
            <CardHeader>
              <CardTitle>Key Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {property.bedrooms && (
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Bedrooms</p>
                      <p className="font-semibold">{property.bedrooms}</p>
                    </div>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center gap-2">
                    <Bath className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Bathrooms</p>
                      <p className="font-semibold">{property.bathrooms}</p>
                    </div>
                  </div>
                )}
                {(property.size_net_sqm || property.size_net_sqm) && (
                  <div className="flex items-center gap-2">
                    <Maximize className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Size</p>
                      <p className="font-semibold">
                        {property.size_net_sqm || property.size_net_sqm} m²
                      </p>
                    </div>
                  </div>
                )}
                {property.year_built && (
                  <div className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Built</p>
                      <p className="font-semibold">{property.year_built}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {property.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {property.description}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Agent Contact */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Contact Agent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {agent && (
                <>
                  <div className="flex items-center gap-3">
                    {agent.avatar ? (
                      <div className="relative h-12 w-12 rounded-full overflow-hidden">
                        <Image src={agent.avatar} alt={agent.name || "Agent"} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-semibold">
                          {agent.name?.charAt(0) || "A"}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{agent.name}</p>
                      {property.organization && (
                        <p className="text-sm text-muted-foreground">
                          {property.organization.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {agentProfile?.publicEmail && (
                    <Button className="w-full" variant="default">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                  )}

                  {agentProfile?.publicPhone && (
                    <Button className="w-full" variant="outline" asChild>
                      <a href={`tel:${agentProfile.publicPhone}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        {agentProfile.publicPhone}
                      </a>
                    </Button>
                  )}
                </>
              )}

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  Property ID: {property.friendlyId}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
