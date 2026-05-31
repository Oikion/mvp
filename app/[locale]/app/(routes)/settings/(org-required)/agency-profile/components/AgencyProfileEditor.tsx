"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

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
import { Loader2, Lock, Shield, Globe, Building2, MapPin, Mail, Share2, Plus, Trash2, GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import type { AgencyProfile } from "@prisma/client";
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
  visibility: z.enum(["PRIVATE", "SECURE", "PUBLIC"]).default("PRIVATE"),
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
  clerkOrgName: string;
  clerkOrgSlug: string;
  onSave?: () => void;
}

const VISIBILITY_OPTIONS = [
  {
    value: "PRIVATE",
    labelKey: "visibility.private.label",
    descriptionKey: "visibility.private.description",
    icon: Lock,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  {
    value: "SECURE",
    labelKey: "visibility.secure.label",
    descriptionKey: "visibility.secure.description",
    icon: Shield,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    value: "PUBLIC",
    labelKey: "visibility.public.label",
    descriptionKey: "visibility.public.description",
    icon: Globe,
    color: "text-success",
    bgColor: "bg-success/10",
  },
] as const;

const FIELD_TYPE_OPTIONS = [
  { value: "text", labelKey: "contactForm.types.text" },
  { value: "email", labelKey: "contactForm.types.email" },
  { value: "phone", labelKey: "contactForm.types.phone" },
  { value: "textarea", labelKey: "contactForm.types.textarea" },
  { value: "select", labelKey: "contactForm.types.select" },
  { value: "checkbox", labelKey: "contactForm.types.checkbox" },
] as const satisfies readonly { value: ContactFormFieldType; labelKey: string }[];

export function AgencyProfileEditor({
  profile,
  clerkOrgName,
  clerkOrgSlug,
  onSave,
}: AgencyProfileEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useAppToast();
  const t = useTranslations("profile.agency");

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
      visibility: profile?.visibility || "PRIVATE",
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
        PRIVATE: t("toast.savedPrivate"),
        SECURE: t("toast.savedSecure"),
        PUBLIC: t("toast.savedPublic"),
      };
      toast.success(t("toast.saved"), {
        description: visibilityMsg[values.visibility] || t("toast.savedDefault"),
        isTranslationKey: false
      });
      router.refresh();
      onSave?.();
    } else {
      toast.error(result.error ?? t("toast.errorSave"), { isTranslationKey: false });
    }
  }

  async function handleSaveContactForm() {
    setIsSavingContactForm(true);
    const result = await updateAgencyContactFormSettings(contactFormEnabled, contactFormFields);
    setIsSavingContactForm(false);

    if (result.success) {
      toast.success(t("toast.settingsSaved"), { isTranslationKey: false });
      router.refresh();
    } else {
      toast.error(result.error ?? t("toast.contactFormError"), { isTranslationKey: false });
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
      <TabsList className="inline-grid grid-cols-4 mb-6">
        <TabsTrigger value="profile">
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{t("tabs.profile")}</span>
        </TabsTrigger>
        <TabsTrigger value="location">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{t("tabs.location")}</span>
        </TabsTrigger>
        <TabsTrigger value="contact">
          <Mail className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{t("tabs.contactForm")}</span>
        </TabsTrigger>
        <TabsTrigger value="social">
          <Share2 className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{t("tabs.social")}</span>
        </TabsTrigger>
      </TabsList>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <TabsContent value="profile" className="space-y-6">
            {/* Visibility */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("visibility.title")}</CardTitle>
                <CardDescription>{t("visibility.description")}</CardDescription>
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
                                  <div className="font-medium text-sm">{t(option.labelKey)}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {t(option.descriptionKey)}
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
                <CardTitle className="text-base">{t("profileUrl.title")}</CardTitle>
                <CardDescription>{t("profileUrl.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1.5">{t("profileUrl.publicUrl")}</p>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-muted border border-r-0 rounded-l-md text-sm text-muted-foreground">
                      /agency/
                    </span>
                    <span className="flex h-9 w-full rounded-r-md border bg-muted px-3 py-2 text-sm text-muted-foreground font-mono">
                      {clerkOrgSlug}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {t("profileUrl.hint")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("info.title")}</CardTitle>
                <CardDescription>{t("info.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Agency name — read-only, synced from Clerk org name */}
                <div>
                  <p className="text-sm font-medium mb-1.5">{t("info.agencyName")}</p>
                  <div className="flex h-9 w-full items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                    {clerkOrgName}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {t("info.agencyNameHint")}
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="logo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("info.logo")}</FormLabel>
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
                      <FormLabel>{t("info.description_label")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("info.descriptionPlaceholder")}
                          rows={5}
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("info.descriptionCharacters", { count: field.value?.length || 0 })}
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
                <CardTitle className="text-base">{t("details.title")}</CardTitle>
                <CardDescription>{t("details.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="yearFounded"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("details.yearFounded")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={1800}
                            max={new Date().getFullYear()}
                            placeholder={t("details.yearFoundedPlaceholder")}
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
                        <FormLabel>{t("details.licenseNumber")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("details.licenseNumberPlaceholder")}
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
                <CardTitle className="text-base">{t("contact.title")}</CardTitle>
                <CardDescription>{t("contact.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contact.email")}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder={t("contact.emailPlaceholder")} {...field} disabled={isLoading} />
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
                        <FormLabel>{t("contact.phone")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("contact.phonePlaceholder")} {...field} disabled={isLoading} />
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
                      <FormLabel>{t("contact.website")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("contact.websitePlaceholder")} {...field} disabled={isLoading} />
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
                <CardTitle className="text-base">{t("address.title")}</CardTitle>
                <CardDescription>{t("address.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("address.street")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("address.streetPlaceholder")} {...field} disabled={isLoading} />
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
                        <FormLabel>{t("address.city")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("address.cityPlaceholder")} {...field} disabled={isLoading} />
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
                        <FormLabel>{t("address.region")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("address.regionPlaceholder")} {...field} disabled={isLoading} />
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
                        <FormLabel>{t("address.postalCode")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("address.postalCodePlaceholder")} {...field} disabled={isLoading} />
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
                        <FormLabel>{t("address.country")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("address.countryPlaceholder")} {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-6">
            {/* Contact Form Toggle */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{t("contactForm.enableTitle")}</span>
                  <Switch
                    checked={contactFormEnabled}
                    onCheckedChange={setContactFormEnabled}
                  />
                </CardTitle>
                <CardDescription>
                  {t("contactForm.enableDescription")}
                </CardDescription>
              </CardHeader>
            </Card>

            {contactFormEnabled && (
              <>
                {/* Current Fields */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("contactForm.fieldsTitle")}</CardTitle>
                    <CardDescription>
                      {t("contactForm.fieldsDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {contactFormFields.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {t("contactForm.noFields")}
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
                                {t("contactForm.required")}
                              </label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t("contactForm.removeField")}
                                onClick={() => removeField(field.id)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
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
                    <CardTitle className="text-base">{t("contactForm.addCustomField")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1">
                        <label htmlFor="field-type-select" className="text-sm font-medium mb-1 block">{t("contactForm.fieldType")}</label>
                        <select
                          id="field-type-select"
                          value={newFieldType}
                          onChange={(e) => setNewFieldType(e.target.value as ContactFormFieldType)}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          {FIELD_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {t(opt.labelKey)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="field-label-input" className="text-sm font-medium mb-1 block">{t("contactForm.fieldLabel")}</label>
                        <Input
                          id="field-label-input"
                          value={newFieldLabel}
                          onChange={(e) => setNewFieldLabel(e.target.value)}
                          placeholder={t("contactForm.fieldLabelPlaceholder")}
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
                        <span className="text-sm">{t("contactForm.requiredField")}</span>
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        leftIcon={<Plus className="h-4 w-4" />}
                        onClick={addCustomField}
                        disabled={!newFieldLabel.trim()}
                      >
                        {t("contactForm.addField")}
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
                    {t("contactForm.saveSettings")}
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
                  {t("saveSettings")}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="social" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("social.title")}</CardTitle>
                <CardDescription>{t("social.description")}</CardDescription>
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
              {t("saveProfile")}
            </Button>
          </div>
        </form>
      </Form>
    </Tabs>
  );
}
