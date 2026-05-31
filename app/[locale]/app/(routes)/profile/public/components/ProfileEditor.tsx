"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Link } from "@/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Plus, Loader2, Lock, Shield, Globe, User, Home, Share2, ExternalLink, Mail, GripVertical, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ShowcasePropertyManager } from "./ShowcasePropertyManager";
import {
  getContactFormSettings,
  updateContactFormSettings,
} from "@/actions/social/contact-form";
import {
  DEFAULT_CONTACT_FORM_FIELDS,
  type ContactFormField,
  type ContactFormFieldType,
} from "@/lib/contact-form-types";

const formSchema = z.object({
  bio: z.string().max(1000, "Bio must be less than 1000 characters").optional(),
  publicPhone: z.string().optional(),
  publicEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  yearsExperience: z.coerce.number().min(0).max(70).optional().nullable(),
  visibility: z.enum(["PRIVATE", "SECURE", "PUBLIC"]).default("PRIVATE"),
  specializations: z.array(z.string()).optional(),
  serviceAreas: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  linkedin: z.string().url("Invalid URL").optional().or(z.literal("")),
  instagram: z.string().url("Invalid URL").optional().or(z.literal("")),
  twitter: z.string().url("Invalid URL").optional().or(z.literal("")),
  facebook: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

interface ProfileEditorProps {
  profile: any;
  username: string;
  userEmail: string;
  showcaseProperties: any[];
  availableProperties: any[];
  onSave?: () => void;
}

const SPECIALIZATION_OPTIONS = [
  "Κατοικίες",
  "Επαγγελματικά",
  "Οικόπεδα",
  "Ενοικιάσεις",
  "Επενδύσεις",
  "Πολυτελή",
  "Νεόδμητα",
];

const LANGUAGE_OPTIONS = [
  "Ελληνικά",
  "English",
  "Deutsch",
  "Français",
  "Italiano",
  "Español",
  "Русский",
  "中文",
];

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

export function ProfileEditor({
  profile,
  username,
  userEmail,
  showcaseProperties,
  availableProperties,
  onSave,
}: ProfileEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newServiceArea, setNewServiceArea] = useState("");
  const [newCertification, setNewCertification] = useState("");
  const router = useRouter();
  const { toast } = useAppToast();
  const t = useTranslations("profile.editor");

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
      try {
        const settings = await getContactFormSettings();
        setContactFormEnabled(settings.enabled);
        setContactFormFields(settings.fields);
      } catch (error) {
        console.error("Failed to load contact form settings:", error);
      }
    }
    loadContactFormSettings();
  }, []);

  const socialLinks = profile?.socialLinks as Record<string, string> | null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bio: profile?.bio || "",
      publicPhone: profile?.publicPhone || "",
      publicEmail: profile?.publicEmail || userEmail || "",
      yearsExperience: profile?.yearsExperience || null,
      visibility: profile?.visibility || "PRIVATE",
      specializations: profile?.specializations || [],
      serviceAreas: profile?.serviceAreas || [],
      languages: profile?.languages || [],
      certifications: profile?.certifications || [],
      linkedin: socialLinks?.linkedin || "",
      instagram: socialLinks?.instagram || "",
      twitter: socialLinks?.twitter || "",
      facebook: socialLinks?.facebook || "",
    },
  });

  async function onSubmit(data: FormValues) {
    try {
      setIsLoading(true);

      const payload = {
        bio: data.bio || null,
        publicPhone: data.publicPhone || null,
        publicEmail: data.publicEmail || null,
        yearsExperience: data.yearsExperience || null,
        visibility: data.visibility,
        specializations: data.specializations || [],
        serviceAreas: data.serviceAreas || [],
        languages: data.languages || [],
        certifications: data.certifications || [],
        socialLinks: {
          linkedin: data.linkedin || null,
          instagram: data.instagram || null,
          twitter: data.twitter || null,
          facebook: data.facebook || null,
        },
      };

      await axios.post("/api/profile/social", payload);

      const visibilityMsg: Record<string, string> = {
        PRIVATE: t("toast.savedPrivate"),
        SECURE: t("toast.savedSecure"),
        PUBLIC: t("toast.savedPublic"),
      };

      toast.success(t("toast.saved"), { description: visibilityMsg[data.visibility] || t("toast.savedDefault"), isTranslationKey: false });

      router.refresh();
      onSave?.();
    } catch (error: any) {
      toast.error(t("toast.error"), { description: error.response?.data || t("toast.errorSave"), isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  }

  const addServiceArea = () => {
    if (newServiceArea.trim()) {
      const current = form.getValues("serviceAreas") || [];
      if (!current.includes(newServiceArea.trim())) {
        form.setValue("serviceAreas", [...current, newServiceArea.trim()]);
      }
      setNewServiceArea("");
    }
  };

  const removeServiceArea = (area: string) => {
    const current = form.getValues("serviceAreas") || [];
    form.setValue("serviceAreas", current.filter((a) => a !== area));
  };

  const addCertification = () => {
    if (newCertification.trim()) {
      const current = form.getValues("certifications") || [];
      if (!current.includes(newCertification.trim())) {
        form.setValue("certifications", [...current, newCertification.trim()]);
      }
      setNewCertification("");
    }
  };

  const removeCertification = (cert: string) => {
    const current = form.getValues("certifications") || [];
    form.setValue("certifications", current.filter((c) => c !== cert));
  };

  const toggleSpecialization = (spec: string) => {
    const current = form.getValues("specializations") || [];
    if (current.includes(spec)) {
      form.setValue("specializations", current.filter((s) => s !== spec));
    } else {
      form.setValue("specializations", [...current, spec]);
    }
  };

  const toggleLanguage = (lang: string) => {
    const current = form.getValues("languages") || [];
    if (current.includes(lang)) {
      form.setValue("languages", current.filter((l) => l !== lang));
    } else {
      form.setValue("languages", [...current, lang]);
    }
  };

  // Contact form management functions
  const handleSaveContactFormSettings = async () => {
    setIsSavingContactForm(true);
    try {
      const result = await updateContactFormSettings({
        enabled: contactFormEnabled,
        fields: contactFormFields,
      });
      if (result.success) {
        toast.success(t("toast.contactFormUpdated"), { description: contactFormEnabled ? t("toast.contactFormEnabled") : t("toast.contactFormDisabled"), isTranslationKey: false });
        router.refresh();
      } else {
        toast.error(t("toast.error"), { description: result.error || t("toast.contactFormError"), isTranslationKey: false });
      }
    } catch (error) {
      toast.error(t("toast.error"), { description: t("toast.contactFormError"), isTranslationKey: false });
    } finally {
      setIsSavingContactForm(false);
    }
  };

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

  const selectedVisibility = form.watch("visibility");

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="inline-grid grid-cols-4 mb-6">
        <TabsTrigger value="profile">
          <User className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{t("tabs.profile")}</span>
        </TabsTrigger>
        <TabsTrigger value="properties">
          <Home className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{t("tabs.showcase")}</span>
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
                              <div
                                key={option.value}
                                role="button"
                                tabIndex={0}
                                onClick={() => field.onChange(option.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    field.onChange(option.value);
                                  }
                                }}
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
                              </div>
                            );
                          })}
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Profile URL - Read Only, based on username */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("profileUrl.title")}</CardTitle>
                <CardDescription>{t("profileUrl.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-muted border border-r-0 rounded-l-md text-sm text-muted-foreground">
                    /agent/
                  </span>
                  <Input
                    value={username}
                    className="rounded-l-none bg-muted"
                    disabled
                    readOnly
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("profileUrl.hint")}{" "}
                  <Link href="/app/profile" className="text-primary hover:underline inline-flex items-center gap-1">
                    {t("profileUrl.accountSettings")}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </p>
              </CardContent>
            </Card>

            {/* Contact & Bio */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("contact.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="publicEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contact.publicEmail")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder={t("contact.publicEmailPlaceholder")}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="publicPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contact.publicPhone")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t("contact.publicPhonePlaceholder")}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contact.bio")}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t("contact.bioPlaceholder")}
                          rows={4}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("contact.bioCharacters", { count: field.value?.length || 0 })}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yearsExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contact.yearsExperience")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min={0}
                          max={70}
                          placeholder="5"
                          className="w-32"
                          disabled={isLoading}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value ? parseInt(e.target.value) : null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Specializations & Languages */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("expertise.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">{t("expertise.specializations")}</label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALIZATION_OPTIONS.map((spec) => {
                      const selected = form.watch("specializations")?.includes(spec);
                      return (
                        <Badge
                          key={spec}
                          variant={selected ? "default" : "outline"}
                          className="cursor-pointer transition-colors"
                          onClick={() => toggleSpecialization(spec)}
                        >
                          {spec}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium mb-2 block">{t("expertise.languages")}</label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGE_OPTIONS.map((lang) => {
                      const selected = form.watch("languages")?.includes(lang);
                      return (
                        <Badge
                          key={lang}
                          variant={selected ? "default" : "outline"}
                          className="cursor-pointer transition-colors"
                          onClick={() => toggleLanguage(lang)}
                        >
                          {lang}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium mb-2 block">{t("expertise.serviceAreas")}</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {form.watch("serviceAreas")?.map((area) => (
                      <Badge key={area} variant="secondary" className="gap-1">
                        {area}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeServiceArea(area)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newServiceArea}
                      onChange={(e) => setNewServiceArea(e.target.value)}
                      placeholder={t("expertise.serviceAreaPlaceholder")}
                      className="max-w-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addServiceArea();
                        }
                      }}
                      disabled={isLoading}
                    />
                    <Button type="button" variant="outline" size="icon" aria-label={t("expertise.addServiceArea")} onClick={addServiceArea}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium mb-2 block">{t("expertise.certifications")}</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {form.watch("certifications")?.map((cert) => (
                      <Badge key={cert} variant="secondary" className="gap-1">
                        {cert}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeCertification(cert)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newCertification}
                      onChange={(e) => setNewCertification(e.target.value)}
                      placeholder={t("expertise.certificationPlaceholder")}
                      className="max-w-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCertification();
                        }
                      }}
                      disabled={isLoading}
                    />
                    <Button type="button" variant="outline" size="icon" aria-label={t("expertise.addCertification")} onClick={addCertification}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="properties">
            <ShowcasePropertyManager
              showcaseProperties={showcaseProperties}
              availableProperties={availableProperties}
            />
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
                        {contactFormFields.map((field, index) => (
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
                                />
                                {t("contactForm.required")}
                              </label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t("contactForm.removeField")}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeField(field.id)}
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
                        <label className="text-sm font-medium mb-1 block">{t("contactForm.fieldType")}</label>
                        <Select
                          value={newFieldType}
                          onValueChange={(v) => setNewFieldType(v as ContactFormFieldType)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {t(opt.labelKey)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-sm font-medium mb-1 block">{t("contactForm.fieldLabel")}</label>
                        <Input
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
                    onClick={handleSaveContactFormSettings}
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
                  onClick={handleSaveContactFormSettings}
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
                    name="linkedin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("social.linkedin")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t("social.linkedinPlaceholder")}
                            disabled={isLoading}
                          />
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
                        <FormLabel>{t("social.instagram")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t("social.instagramPlaceholder")}
                            disabled={isLoading}
                          />
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
                        <FormLabel>{t("social.twitter")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t("social.twitterPlaceholder")}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="facebook"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("social.facebook")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t("social.facebookPlaceholder")}
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
