"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppToast } from "@/hooks/use-app-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Lock, Shield, Globe, Building2, MapPin, Home, Mail, Share2, Plus, Trash2, GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import type { AgencyProfile } from "@prisma/client";
import { ShowcasePropertyManager } from "./ShowcasePropertyManager";
import { LogoUpload } from "./LogoUpload";
import { upsertAgencyProfile, type AgencyProfileInput } from "@/actions/organization/agency-profile";
import {
  getAgencyContactFormSettings,
  updateAgencyContactFormSettings,
} from "@/actions/organization/agency-contact-form";
import {
  DEFAULT_CONTACT_FORM_FIELDS,
  type ContactFormField,
  type ContactFormFieldType,
} from "@/lib/contact-form-types";

const formSchema = z.object({
  // name and slug are read-only — always sourced from Clerk org settings
  logo: z.string().optional(),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("GR"),
  visibility: z.enum(["PERSONAL", "SECURE", "PUBLIC"]).default("PERSONAL"),
  facebook: z.string().url("Invalid URL").optional().or(z.literal("")),
  instagram: z.string().url("Invalid URL").optional().or(z.literal("")),
  linkedin: z.string().url("Invalid URL").optional().or(z.literal("")),
  twitter: z.string().url("Invalid URL").optional().or(z.literal("")),
  yearFounded: z.coerce.number().min(1800).max(new Date().getFullYear()).optional().nullable(),
  licenseNumber: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AgencyProfileEditorProps {
  profile: AgencyProfile | null;
  showcaseProperties: unknown[];
  availableProperties: unknown[];
  clerkOrgName: string;
  clerkOrgSlug: string;
  onSave?: () => void;
}

const VISIBILITY_OPTIONS = [
  {
    value: "PERSONAL",
    label: "Personal",
    description: "Hidden from everyone",
    icon: Lock,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  {
    value: "SECURE",
    label: "Secure",
    description: "Only registered users can view",
    icon: Shield,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    value: "PUBLIC",
    label: "Public",
    description: "Anyone can view",
    icon: Globe,
    color: "text-success",
    bgColor: "bg-success/10",
  },
];

const FIELD_TYPE_OPTIONS: { value: ContactFormFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "textarea", label: "Text Area" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
];

export function AgencyProfileEditor({
  profile,
  showcaseProperties: _showcaseProperties,
  availableProperties: _availableProperties,
  clerkOrgName,
  clerkOrgSlug,
  onSave,
}: AgencyProfileEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useAppToast();

  // Contact form settings state
  const [contactFormEnabled, setContactFormEnabled] = useState(false);
  const [contactFormFields, setContactFormFields] = useState<ContactFormField[]>(DEFAULT_CONTACT_FORM_FIELDS);
  const [isSavingContactForm, setIsSavingContactForm] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<ContactFormFieldType>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  // Load contact form settings on mount
  useEffect(() => {
    async function loadContactFormSettings() {
      const result = await getAgencyContactFormSettings();
      if (result.success && result.data) {
        setContactFormEnabled(result.data.enabled);
        if (result.data.fields) {
          setContactFormFields(result.data.fields as ContactFormField[]);
        }
      }
    }
    loadContactFormSettings();
  }, []);

  const socialLinks = (profile?.socialLinks as Record<string, string>) || {};

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      logo: profile?.logo || "",
      description: profile?.description || "",
      phone: profile?.phone || "",
      email: profile?.email || "",
      website: profile?.website || "",
      address: profile?.address || "",
      city: profile?.city || "",
      region: profile?.region || "",
      postalCode: profile?.postalCode || "",
      country: profile?.country || "GR",
      visibility: profile?.visibility || "PERSONAL",
      facebook: socialLinks.facebook || "",
      instagram: socialLinks.instagram || "",
      linkedin: socialLinks.linkedin || "",
      twitter: socialLinks.twitter || "",
      yearFounded: profile?.yearFounded || null,
      licenseNumber: profile?.licenseNumber || "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    const payload: AgencyProfileInput = {
      logo: values.logo || undefined,
      description: values.description || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      website: values.website || undefined,
      address: values.address || undefined,
      city: values.city || undefined,
      region: values.region || undefined,
      postalCode: values.postalCode || undefined,
      country: values.country || undefined,
      visibility: values.visibility,
      socialLinks: Object.fromEntries(
        Object.entries({
          facebook: values.facebook || "",
          instagram: values.instagram || "",
          linkedin: values.linkedin || "",
          twitter: values.twitter || "",
        }).filter(([, v]) => v !== "")
      ),
    };

    const result = await upsertAgencyProfile(payload);
    setIsLoading(false);

    if (result.success) {
      const visibilityMsg: Record<string, string> = {
        PERSONAL: "Your agency profile is hidden.",
        SECURE: "Your agency profile is visible to registered users only.",
        PUBLIC: "Your agency profile is now live and visible to everyone!",
      };
      toast.success("Profile Saved", { 
        description: visibilityMsg[values.visibility] || "Profile updated", 
        isTranslationKey: false 
      });
      router.refresh();
      onSave?.();
    } else {
      toast.error(result.error ?? "Failed to save profile", { isTranslationKey: false });
    }
  }

  async function handleSaveContactForm() {
    setIsSavingContactForm(true);
    const result = await updateAgencyContactFormSettings(contactFormEnabled, contactFormFields);
    setIsSavingContactForm(false);

    if (result.success) {
      toast.success("settingsSaved", { isTranslationKey: false });
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to save contact form settings", { isTranslationKey: false });
    }
  }

  // Contact form field management functions
  const addCustomField = () => {
    if (!newFieldLabel.trim()) return;
    
    const newField: ContactFormField = {
      id: `custom_${Date.now()}`,
      type: newFieldType,
      label: newFieldLabel.trim(),
      placeholder: "",
      required: newFieldRequired,
      order: contactFormFields.length,
    };
    
    setContactFormFields([...contactFormFields, newField]);
    setNewFieldLabel("");
    setNewFieldType("text");
    setNewFieldRequired(false);
  };

  const removeField = (fieldId: string) => {
    setContactFormFields(
      contactFormFields
        .filter((f) => f.id !== fieldId)
        .map((f, index) => ({ ...f, order: index }))
    );
  };

  const toggleFieldRequired = (fieldId: string) => {
    setContactFormFields(
      contactFormFields.map((f) =>
        f.id === fieldId ? { ...f, required: !f.required } : f
      )
    );
  };

  const updateFieldLabel = (fieldId: string, label: string) => {
    setContactFormFields(
      contactFormFields.map((f) =>
        f.id === fieldId ? { ...f, label } : f
      )
    );
  };

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="inline-grid grid-cols-5 mb-6">
        <TabsTrigger value="profile">
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Profile</span>
        </TabsTrigger>
        <TabsTrigger value="location">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Location</span>
        </TabsTrigger>
        <TabsTrigger value="showcase">
          <Home className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Showcase</span>
        </TabsTrigger>
        <TabsTrigger value="contact">
          <Mail className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Contact Form</span>
        </TabsTrigger>
        <TabsTrigger value="social">
          <Share2 className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Social</span>
        </TabsTrigger>
      </TabsList>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <TabsContent value="profile" className="space-y-6">
            {/* Visibility */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile Visibility</CardTitle>
                <CardDescription>Control who can see your agency profile</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {VISIBILITY_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            const isSelected = field.value === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => field.onChange(option.value)}
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all text-left ${
                                  isSelected
                                    ? `border-primary ${option.bgColor}`
                                    : "border-transparent bg-muted/50 hover:bg-muted"
                                }`}
                              >
                                <div className={`rounded-full p-2 ${option.bgColor}`}>
                                  <Icon className={`h-4 w-4 ${option.color}`} />
                                </div>
                                <div>
                                  <div className="font-medium text-sm">{option.label}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {option.description}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Profile URL — read-only, synced from Clerk org slug */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile URL</CardTitle>
                <CardDescription>Your agency's public profile address — managed via your organization settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1.5">Public URL</p>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-muted border border-r-0 rounded-l-md text-sm text-muted-foreground">
                      /agency/
                    </span>
                    <span className="flex h-9 w-full rounded-r-md border bg-muted px-3 py-2 text-sm text-muted-foreground font-mono">
                      {clerkOrgSlug}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    This URL is tied to your organization's slug in Clerk. To change it, update the slug in your Clerk organization settings.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Agency Information</CardTitle>
                <CardDescription>Basic details about your agency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Agency name — read-only, synced from Clerk org name */}
                <div>
                  <p className="text-sm font-medium mb-1.5">Agency Name</p>
                  <div className="flex h-9 w-full items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                    {clerkOrgName}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Managed via your Clerk organization settings.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="logo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agency Logo</FormLabel>
                      <FormControl>
                        <LogoUpload
                          currentLogo={field.value}
                          onChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell clients about your agency..."
                          rows={5}
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription>
                        {(field.value?.length || 0)}/1000 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Agency Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Agency Details</CardTitle>
                <CardDescription>Additional information about your agency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="yearFounded"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year Founded</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={1800}
                            max={new Date().getFullYear()}
                            placeholder="2020"
                            disabled={isLoading}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(e.target.value ? Number.parseInt(e.target.value, 10) : null)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="licenseNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>License / Registration Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="REA-12345"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Information</CardTitle>
                <CardDescription>How clients can reach you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="info@agency.com" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+30 210 1234567" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://www.agency.com" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="location" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Physical Address</CardTitle>
                <CardDescription>Your agency's office location</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Athens" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region</FormLabel>
                        <FormControl>
                          <Input placeholder="Attica" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="10431" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="GR" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="showcase" className="space-y-6">
            <ShowcasePropertyManager profileSlug={profile?.slug} />
          </TabsContent>

          <TabsContent value="contact" className="space-y-6">
            {/* Contact Form Toggle */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Enable Contact Form</span>
                  <Switch
                    checked={contactFormEnabled}
                    onCheckedChange={setContactFormEnabled}
                  />
                </CardTitle>
                <CardDescription>
                  Allow visitors to contact you directly through your profile page
                </CardDescription>
              </CardHeader>
            </Card>

            {contactFormEnabled && (
              <>
                {/* Current Fields */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Form Fields</CardTitle>
                    <CardDescription>
                      Configure which fields appear on your contact form
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {contactFormFields.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No fields configured. Add some fields below.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {contactFormFields.map((field) => (
                          <div
                            key={field.id}
                            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                            <div className="flex-1 min-w-0">
                              <Input
                                value={field.label}
                                onChange={(e) => updateFieldLabel(field.id, e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {field.type}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={() => toggleFieldRequired(field.id)}
                                  className="h-3 w-3"
                                />{" "}
                                Required
                              </label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeField(field.id)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Add New Field */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Add Custom Field</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1">
                        <label htmlFor="field-type-select" className="text-sm font-medium mb-1 block">Field Type</label>
                        <select
                          id="field-type-select"
                          value={newFieldType}
                          onChange={(e) => setNewFieldType(e.target.value as ContactFormFieldType)}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          {FIELD_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="field-label-input" className="text-sm font-medium mb-1 block">Field Label</label>
                        <Input
                          id="field-label-input"
                          value={newFieldLabel}
                          onChange={(e) => setNewFieldLabel(e.target.value)}
                          placeholder="e.g., Property Interest"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomField();
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newFieldRequired}
                          onChange={(e) => setNewFieldRequired(e.target.checked)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">Required field</span>
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        leftIcon={<Plus className="h-4 w-4" />}
                        onClick={addCustomField}
                        disabled={!newFieldLabel.trim()}
                      >
                        Add Field
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Save Contact Form Settings */}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    leftIcon={isSavingContactForm ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
                    onClick={handleSaveContactForm}
                    disabled={isSavingContactForm}
                  >
                    Save Contact Form Settings
                  </Button>
                </div>
              </>
            )}

            {!contactFormEnabled && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  leftIcon={isSavingContactForm ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
                  onClick={handleSaveContactForm}
                  disabled={isSavingContactForm}
                >
                  Save Settings
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="social" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Social Media Links</CardTitle>
                <CardDescription>Connect your social media profiles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="facebook"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facebook</FormLabel>
                        <FormControl>
                          <Input placeholder="https://facebook.com/your-agency" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram</FormLabel>
                        <FormControl>
                          <Input placeholder="https://instagram.com/your-agency" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="linkedin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn</FormLabel>
                        <FormControl>
                          <Input placeholder="https://linkedin.com/company/your-agency" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="twitter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Twitter / X</FormLabel>
                        <FormControl>
                          <Input placeholder="https://twitter.com/your-agency" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Save Button - always visible */}
          <div className="flex justify-end pt-6 border-t mt-6">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Profile
            </Button>
          </div>
        </form>
      </Form>
    </Tabs>
  );
}
