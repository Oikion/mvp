"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import moment from "moment";
import axios from "axios";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CreateBookingButton } from "@/components/calendar/CreateBookingButton";
import { LinkedEntitiesPanel, LinkEntityDialog } from "@/components/linking";
import { ShareModal } from "@/components/social/ShareModal";
import { PropertyComments } from "../../../mls/properties/[propertyId]/components/PropertyComments";
import {
  usePropertyLinked,
  useLinkClientsToProperty,
  useUnlinkClientFromProperty,
} from "@/hooks/swr";
import {
  Globe,
  Eye,
  ExternalLink,
  Share2,
  Copy,
  Check,
  Lock,
  Users,
  Pencil,
  X,
  Save,
  Loader2,
} from "lucide-react";
import Link from "next/link";

const formatDateTime = (value?: Date | string | null) => {
  if (!value) return "N/A";
  return moment(value).format("DD/MM/YYYY, HH:mm:ss");
};

interface PropertyData {
  id: string;
  property_name: string;
  property_type?: string | null;
  property_status?: string | null;
  transaction_type?: string | null;
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_feet?: number | null;
  size_net_sqm?: number | null;
  size_gross_sqm?: number | null;
  lot_size?: number | null;
  plot_size_sqm?: number | null;
  year_built?: number | null;
  floor?: string | null;
  floors_total?: number | null;
  description?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  municipality?: string | null;
  area?: string | null;
  postal_code?: string | null;
  heating_type?: string | null;
  energy_cert_class?: string | null;
  condition?: string | null;
  is_exclusive?: boolean | null;
  elevator?: boolean | null;
  accepts_pets?: boolean | null;
  property_preferences?: unknown;
  communication_notes?: unknown;
  portal_visibility?: string | null;
  assigned_to_user?: { name: string | null; id?: string } | null;
  assigned_to?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  contacts?: unknown[];
}

interface PropertyViewEditableProps {
  data: PropertyData;
  isReadOnly?: boolean;
  sharePermission?: "VIEW_ONLY" | "VIEW_COMMENT" | null;
  currentUserId?: string;
  defaultEditMode?: boolean;
}

// Type options
const propertyTypeOptions = [
  { value: "APARTMENT", label: "Apartment" },
  { value: "HOUSE", label: "House" },
  { value: "MAISONETTE", label: "Maisonette" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "PARKING", label: "Parking" },
  { value: "PLOT", label: "Plot" },
  { value: "FARM", label: "Farm" },
  { value: "INDUSTRIAL", label: "Industrial" },
  { value: "OTHER", label: "Other" },
];

const propertyStatusOptions = [
  { value: "AVAILABLE", label: "Available" },
  { value: "RESERVED", label: "Reserved" },
  { value: "NEGOTIATION", label: "In Negotiation" },
  { value: "RENTED", label: "Rented" },
  { value: "SOLD", label: "Sold" },
];

const transactionTypeOptions = [
  { value: "SALE", label: "Sale" },
  { value: "RENTAL", label: "Rental" },
  { value: "SHORT_TERM", label: "Short-term" },
  { value: "EXCHANGE", label: "Exchange" },
];

const heatingTypeOptions = [
  { value: "AUTONOMOUS", label: "Autonomous" },
  { value: "CENTRAL", label: "Central" },
  { value: "NATURAL_GAS", label: "Natural Gas" },
  { value: "HEAT_PUMP", label: "Heat Pump" },
  { value: "ELECTRIC", label: "Electric" },
  { value: "NONE", label: "None" },
];

const conditionOptions = [
  { value: "EXCELLENT", label: "Excellent" },
  { value: "VERY_GOOD", label: "Very Good" },
  { value: "GOOD", label: "Good" },
  { value: "NEEDS_RENOVATION", label: "Needs Renovation" },
];

const floorOptions = [
  { value: "BASEMENT", label: "Basement" },
  { value: "GROUND", label: "Ground" },
  { value: "1ST", label: "1st" },
  { value: "2ND", label: "2nd" },
  { value: "3RD", label: "3rd" },
  { value: "4TH", label: "4th" },
  { value: "5TH", label: "5th" },
  { value: "6TH", label: "6th" },
  { value: "7TH", label: "7th" },
  { value: "8TH", label: "8th" },
  { value: "9TH", label: "9th" },
  { value: "10TH", label: "10th" },
  { value: "PENTHOUSE", label: "Penthouse" },
];

export function PropertyViewEditable({ 
  data, 
  isReadOnly = false,
  sharePermission = null,
  currentUserId = "",
  defaultEditMode = false,
}: PropertyViewEditableProps) {
  const router = useRouter();
  const t = useTranslations("mls");
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(defaultEditMode);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state - all editable fields
  const [formData, setFormData] = useState({
    property_name: data.property_name || "",
    property_type: data.property_type || "",
    property_status: data.property_status || "",
    transaction_type: data.transaction_type || "",
    price: data.price?.toString() || "",
    bedrooms: data.bedrooms?.toString() || "",
    bathrooms: data.bathrooms?.toString() || "",
    size_net_sqm: data.size_net_sqm?.toString() || data.square_feet?.toString() || "",
    size_gross_sqm: data.size_gross_sqm?.toString() || "",
    plot_size_sqm: data.plot_size_sqm?.toString() || data.lot_size?.toString() || "",
    year_built: data.year_built?.toString() || "",
    floor: data.floor || "",
    floors_total: data.floors_total?.toString() || "",
    description: data.description || "",
    address_street: data.address_street || "",
    municipality: data.municipality || data.address_city || "",
    area: data.area || data.address_state || "",
    postal_code: data.postal_code || data.address_zip || "",
    heating_type: data.heating_type || "",
    energy_cert_class: data.energy_cert_class || "",
    condition: data.condition || "",
    is_exclusive: data.is_exclusive || false,
    elevator: data.elevator || false,
    accepts_pets: data.accepts_pets || false,
  });

  // UI states
  const [linkClientDialogOpen, setLinkClientDialogOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [visibility, setVisibility] = useState(data.portal_visibility || "PRIVATE");
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publicUrl, setPublicUrl] = useState(`/property/${data.id}`);

  // SWR hooks for linked data
  const { 
    clients, 
    events, 
    isLoading: isLoadingLinked, 
    mutate: mutateLinked 
  } = usePropertyLinked(data?.id);

  const { linkClients, isLinking } = useLinkClientsToProperty(data.id);
  const { unlinkClient, isUnlinking } = useUnlinkClientFromProperty(data.id);

  // Set public URL after mount
  useState(() => {
    if (typeof window !== "undefined") {
      setPublicUrl(`${window.location.origin}/property/${data.id}`);
    }
  });

  // Update field handler
  const updateField = useCallback((field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        id: data.id,
        property_name: formData.property_name || "Untitled Property",
        property_type: formData.property_type || null,
        property_status: formData.property_status || null,
        transaction_type: formData.transaction_type || null,
        price: formData.price ? parseFloat(formData.price) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
        size_net_sqm: formData.size_net_sqm ? parseFloat(formData.size_net_sqm) : null,
        size_gross_sqm: formData.size_gross_sqm ? parseFloat(formData.size_gross_sqm) : null,
        plot_size_sqm: formData.plot_size_sqm ? parseFloat(formData.plot_size_sqm) : null,
        year_built: formData.year_built ? parseInt(formData.year_built) : null,
        floor: formData.floor || null,
        floors_total: formData.floors_total ? parseInt(formData.floors_total) : null,
        description: formData.description || null,
        address_street: formData.address_street || null,
        municipality: formData.municipality || null,
        area: formData.area || null,
        postal_code: formData.postal_code || null,
        heating_type: formData.heating_type || null,
        condition: formData.condition || null,
        is_exclusive: formData.is_exclusive,
        elevator: formData.elevator,
        accepts_pets: formData.accepts_pets,
      };

      await axios.put("/api/mls/properties", payload);
      toast.success("Property updated successfully");
      setIsEditMode(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to update property:", error);
      toast.error("Failed to update property");
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel edit
  const handleCancel = () => {
    // Reset form to original data
    setFormData({
      property_name: data.property_name || "",
      property_type: data.property_type || "",
      property_status: data.property_status || "",
      transaction_type: data.transaction_type || "",
      price: data.price?.toString() || "",
      bedrooms: data.bedrooms?.toString() || "",
      bathrooms: data.bathrooms?.toString() || "",
      size_net_sqm: data.size_net_sqm?.toString() || data.square_feet?.toString() || "",
      size_gross_sqm: data.size_gross_sqm?.toString() || "",
      plot_size_sqm: data.plot_size_sqm?.toString() || data.lot_size?.toString() || "",
      year_built: data.year_built?.toString() || "",
      floor: data.floor || "",
      floors_total: data.floors_total?.toString() || "",
      description: data.description || "",
      address_street: data.address_street || "",
      municipality: data.municipality || data.address_city || "",
      area: data.area || data.address_state || "",
      postal_code: data.postal_code || data.address_zip || "",
      heating_type: data.heating_type || "",
      energy_cert_class: data.energy_cert_class || "",
      condition: data.condition || "",
      is_exclusive: data.is_exclusive || false,
      elevator: data.elevator || false,
      accepts_pets: data.accepts_pets || false,
    });
    setIsEditMode(false);
  };

  // Link handlers
  const handleLinkClients = async (clientIds: string[]) => {
    try {
      await linkClients(clientIds);
      await mutateLinked();
    } catch (error) {
      console.error("Failed to link clients:", error);
      throw error;
    }
  };

  const handleUnlinkClient = async (clientId: string) => {
    try {
      await unlinkClient(clientId);
      toast.success("Client unlinked successfully");
      await mutateLinked();
    } catch (error) {
      console.error("Failed to unlink client:", error);
      toast.error("Failed to unlink client");
    }
  };

  const handleVisibilityChange = async (newVisibility: string) => {
    setIsUpdatingVisibility(true);
    try {
      await axios.put("/api/mls/properties", {
        id: data.id,
        portal_visibility: newVisibility,
      });
      setVisibility(newVisibility);
      toast.success(
        newVisibility === "PUBLIC"
          ? "Property is now public!"
          : newVisibility === "SELECTED"
          ? "Property visible to connections only"
          : "Property is now private"
      );
    } catch (error) {
      console.error("Failed to update visibility:", error);
      toast.error("Failed to update visibility");
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Editable field components
  const EditableText = ({ 
    label, 
    field, 
    value, 
    placeholder = "",
    multiline = false,
  }: { 
    label: string; 
    field: string; 
    value: string;
    placeholder?: string;
    multiline?: boolean;
  }) => {
    if (isEditMode) {
      if (multiline) {
        return (
          <div className="space-y-1">
            <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
            <Textarea
              value={value}
              onChange={(e) => updateField(field, e.target.value)}
              placeholder={placeholder || label}
              className="min-h-[100px]"
            />
          </div>
        );
      }
      return (
        <div className="space-y-1">
          <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
          <Input
            value={value}
            onChange={(e) => updateField(field, e.target.value)}
            placeholder={placeholder || label}
          />
        </div>
      );
    }
    
    return (
      <div className="-mx-2 flex items-start justify-between space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">{label}</p>
          <p className="text-sm text-muted-foreground break-all">{value || "N/A"}</p>
        </div>
      </div>
    );
  };

  const EditableNumber = ({ 
    label, 
    field, 
    value,
    prefix = "",
    suffix = "",
  }: { 
    label: string; 
    field: string; 
    value: string;
    prefix?: string;
    suffix?: string;
  }) => {
    if (isEditMode) {
      return (
        <div className="space-y-1">
          <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
          <div className="relative">
            {prefix && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>
            )}
            <Input
              type="number"
              value={value}
              onChange={(e) => updateField(field, e.target.value)}
              placeholder={label}
              className={prefix ? "pl-7" : ""}
            />
            {suffix && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{suffix}</span>
            )}
          </div>
        </div>
      );
    }
    
    const displayValue = value 
      ? `${prefix}${parseFloat(value).toLocaleString()}${suffix}`
      : "N/A";
    
    return (
      <div className="-mx-2 flex items-start justify-between space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">{label}</p>
          <p className="text-sm text-muted-foreground">{displayValue}</p>
        </div>
      </div>
    );
  };

  const EditableSelect = ({ 
    label, 
    field, 
    value, 
    options,
  }: { 
    label: string; 
    field: string; 
    value: string;
    options: { value: string; label: string }[];
  }) => {
    if (isEditMode) {
      return (
        <div className="space-y-1">
          <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
          <Select value={value} onValueChange={(v) => updateField(field, v)}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    
    const displayValue = options.find(o => o.value === value)?.label || value || "N/A";
    
    return (
      <div className="-mx-2 flex items-start justify-between space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">{label}</p>
          <p className="text-sm text-muted-foreground">{displayValue}</p>
        </div>
      </div>
    );
  };

  const EditableSwitch = ({ 
    label, 
    field, 
    value,
  }: { 
    label: string; 
    field: string; 
    value: boolean;
  }) => {
    if (isEditMode) {
      return (
        <div className="flex items-center justify-between rounded-md border p-3">
          <Label className="text-sm font-medium">{label}</Label>
          <Switch
            checked={value}
            onCheckedChange={(checked) => updateField(field, checked)}
          />
        </div>
      );
    }
    
    return (
      <div className="-mx-2 flex items-start justify-between space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">{label}</p>
          <p className="text-sm text-muted-foreground">{value ? "Yes" : "No"}</p>
        </div>
      </div>
    );
  };

  // Combine events
  const allEvents = [...(events.upcoming || []), ...(events.past || [])];

  return (
    <div className="space-y-6">
      {/* Public Visibility Card - Only show for non-shared (owner) view */}
      {!isReadOnly && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Public Visibility</CardTitle>
                  <CardDescription>Control who can see this property</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {visibility === "PUBLIC" ? (
                  <Badge className="bg-success/15 text-success dark:text-green-400 hover:bg-success/20">
                    <Eye className="h-3 w-3 mr-1" />
                    Public
                  </Badge>
                ) : visibility === "SELECTED" ? (
                  <Badge className="bg-primary/15 text-primary dark:text-blue-400 hover:bg-primary/20">
                    <Users className="h-3 w-3 mr-1" />
                    Connections Only
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Lock className="h-3 w-3 mr-1" />
                    Private
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={visibility === "PRIVATE" ? "default" : "outline"}
                size="sm"
                onClick={() => handleVisibilityChange("PRIVATE")}
                disabled={isUpdatingVisibility}
              >
                <Lock className="h-4 w-4 mr-1" />
                Private
              </Button>
              <Button
                variant={visibility === "SELECTED" ? "default" : "outline"}
                size="sm"
                onClick={() => handleVisibilityChange("SELECTED")}
                disabled={isUpdatingVisibility}
              >
                <Users className="h-4 w-4 mr-1" />
                Connections Only
              </Button>
              <Button
                variant={visibility === "PUBLIC" ? "default" : "outline"}
                size="sm"
                onClick={() => handleVisibilityChange("PUBLIC")}
                disabled={isUpdatingVisibility}
              >
                <Globe className="h-4 w-4 mr-1" />
                Public
              </Button>
            </div>

            {visibility === "PUBLIC" && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Public URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-background px-3 py-2 rounded border truncate">
                    {publicUrl}
                  </code>
                  <Button variant="outline" size="sm" onClick={copyPublicUrl}>
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Link href={`/property/${data.id}`} target="_blank">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <p className="text-sm font-medium">Share with Connections</p>
                <p className="text-xs text-muted-foreground">
                  Share this property with your agent network
                </p>
              </div>
              <Button variant="outline" onClick={() => setShareModalOpen(true)}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Property Card with Visual Editing */}
      <Card className={isEditMode ? "ring-2 ring-primary/20" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {isEditMode ? (
                <Input
                  value={formData.property_name}
                  onChange={(e) => updateField("property_name", e.target.value)}
                  className="text-xl font-semibold"
                  placeholder="Property name"
                />
              ) : (
                <CardTitle className="text-xl">{formData.property_name}</CardTitle>
              )}
              <p className="text-sm text-muted-foreground mt-1">ID: {data.id}</p>
            </div>
            {!isReadOnly && (
              <div className="flex gap-2">
                {isEditMode ? (
                  <>
                    <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    <CreateBookingButton
                      propertyId={data.id}
                      eventType="property-viewing"
                      prefilledData={{
                        notes: `Property: ${formData.property_name}${formData.address_street ? ` - ${formData.address_street}` : ''}`,
                      }}
                    />
                    <Button onClick={() => setIsEditMode(true)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          {/* Classification Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Classification</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <EditableSelect
                label="Property Type"
                field="property_type"
                value={formData.property_type}
                options={propertyTypeOptions}
              />
              <EditableSelect
                label="Status"
                field="property_status"
                value={formData.property_status}
                options={propertyStatusOptions}
              />
              <EditableSelect
                label="Transaction Type"
                field="transaction_type"
                value={formData.transaction_type}
                options={transactionTypeOptions}
              />
            </div>
          </div>

          {/* Pricing Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <EditableNumber
                label="Price"
                field="price"
                value={formData.price}
                prefix="€"
              />
              <EditableSwitch
                label="Exclusive Listing"
                field="is_exclusive"
                value={formData.is_exclusive}
              />
            </div>
          </div>

          {/* Location Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditableText
                label="Street Address"
                field="address_street"
                value={formData.address_street}
              />
              <EditableText
                label="Municipality"
                field="municipality"
                value={formData.municipality}
              />
              <EditableText
                label="Area"
                field="area"
                value={formData.area}
              />
              <EditableText
                label="Postal Code"
                field="postal_code"
                value={formData.postal_code}
              />
            </div>
          </div>

          {/* Property Details Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Property Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <EditableNumber
                label="Bedrooms"
                field="bedrooms"
                value={formData.bedrooms}
              />
              <EditableNumber
                label="Bathrooms"
                field="bathrooms"
                value={formData.bathrooms}
              />
              <EditableNumber
                label="Net Size"
                field="size_net_sqm"
                value={formData.size_net_sqm}
                suffix=" m²"
              />
              <EditableNumber
                label="Gross Size"
                field="size_gross_sqm"
                value={formData.size_gross_sqm}
                suffix=" m²"
              />
              <EditableNumber
                label="Plot Size"
                field="plot_size_sqm"
                value={formData.plot_size_sqm}
                suffix=" m²"
              />
              <EditableNumber
                label="Year Built"
                field="year_built"
                value={formData.year_built}
              />
              <EditableSelect
                label="Floor"
                field="floor"
                value={formData.floor}
                options={floorOptions}
              />
              <EditableNumber
                label="Total Floors"
                field="floors_total"
                value={formData.floors_total}
              />
            </div>
          </div>

          {/* Characteristics Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Characteristics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <EditableSelect
                label="Heating Type"
                field="heating_type"
                value={formData.heating_type}
                options={heatingTypeOptions}
              />
              <EditableSelect
                label="Condition"
                field="condition"
                value={formData.condition}
                options={conditionOptions}
              />
              <EditableSwitch
                label="Elevator"
                field="elevator"
                value={formData.elevator}
              />
              <EditableSwitch
                label="Accepts Pets"
                field="accepts_pets"
                value={formData.accepts_pets}
              />
            </div>
          </div>

          {/* Description Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Description</h3>
            <EditableText
              label="Description"
              field="description"
              value={formData.description}
              multiline
            />
          </div>

          {/* Metadata Section */}
          {!isEditMode && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Metadata</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="-mx-2 flex items-start justify-between space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Assigned To</p>
                    <p className="text-sm text-muted-foreground">{data.assigned_to_user?.name || "N/A"}</p>
                  </div>
                </div>
                <div className="-mx-2 flex items-start justify-between space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Created</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(data.createdAt)}</p>
                  </div>
                </div>
                <div className="-mx-2 flex items-start justify-between space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Updated</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(data.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Entities Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LinkedEntitiesPanel
          type="clients"
          entities={clients as unknown as Array<{ id: string; client_name: string; client_type?: string; client_status?: string; primary_email?: string; primary_phone?: string; intent?: string; assigned_to_user?: { id: string; name: string }; }>}
          isLoading={isLoadingLinked || isLinking || isUnlinking}
          onLinkEntity={isReadOnly ? undefined : () => setLinkClientDialogOpen(true)}
          onUnlinkEntity={isReadOnly ? undefined : handleUnlinkClient}
          showAddButton={!isReadOnly}
          emptyMessage="No clients linked to this property yet."
        />

        <LinkedEntitiesPanel
          type="events"
          entities={allEvents as unknown as Array<{ id: string; title: string; description?: string; startTime: string; endTime: string; location?: string; status?: string; eventType?: string; }>}
          isLoading={isLoadingLinked}
          showAddButton={false}
          emptyMessage="No calendar events for this property yet."
        />
      </div>

      {/* Comments Section */}
      {currentUserId && (
        <PropertyComments
          propertyId={data.id}
          canComment={!isReadOnly || sharePermission === "VIEW_COMMENT"}
          currentUserId={currentUserId}
        />
      )}

      {/* Link Client Dialog */}
      {!isReadOnly && (
        <LinkEntityDialog
          open={linkClientDialogOpen}
          onOpenChange={setLinkClientDialogOpen}
          entityType="client"
          sourceId={data.id}
          sourceType="property"
          alreadyLinkedIds={clients.map((c) => c.id)}
          onLink={handleLinkClients}
          title="Link Clients to Property"
          description="Select clients who are interested in or viewing this property."
        />
      )}

      {/* Share Modal */}
      {!isReadOnly && (
        <ShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          entityType="PROPERTY"
          entityId={data.id}
          entityName={formData.property_name}
        />
      )}
    </div>
  );
}
