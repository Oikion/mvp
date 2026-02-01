"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Link } from "@/navigation";

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
  type ContactFormField,
  type ContactFormFieldType,
  DEFAULT_CONTACT_FORM_FIELDS,
} from "@/actions/social/contact-form";

const formSchema = z.object({
  bio: z.string().max(1000, "Bio must be less than 1000 characters").optional(),
  publicPhone: z.string().optional(),
  publicEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  yearsExperience: z.coerce.number().min(0).max(70).optional().nullable(),
  visibility: z.enum(["PERSONAL", "SECURE", "PUBLIC"]).default("PERSONAL"),
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
      visibility: profile?.visibility || "PERSONAL",
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

      const visibilityMsg = {
        PERSONAL: "Your profile is hidden.",
        SECURE: "Your profile is visible to registered users only.",
        PUBLIC: "Your profile is now live and visible to everyone!",
      };

      toast.success("Profile Saved", { description: visibilityMsg, isTranslationKey: false });

      router.refresh();
      onSave?.();
    } catch (error: any) {
      toast.error("Error", { description: error.response?.data || "Failed to update profile. Please try again.", isTranslationKey: false });
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
        toast.success("Contact Form Updated", { description: contactFormEnabled, isTranslationKey: false });
        router.refresh();
      } else {
        toast.error("Error", { description: result.error || "Failed to update contact form settings.", isTranslationKey: false });
      }
    } catch (error) {
      toast.error("Error", { description: "Failed to update contact form settings.", isTranslationKey: false });
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
          <span className="hidden sm:inline">Profile</span>
        </TabsTrigger>
        <TabsTrigger value="properties">
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
                <CardDescription>Control who can see your profile</CardDescription>
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
                                onClick={() => field.onChange(option.value)}
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
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
                <CardTitle className="text-base">Profile URL</CardTitle>
                <CardDescription>Your public profile address based on your username</CardDescription>
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
                  Your profile URL is based on your username. To change it, update your username in{" "}
                  <Link href="/app/profile" className="text-primary hover:underline inline-flex items-center gap-1">
                    account settings
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </p>
              </CardContent>
            </Card>

            {/* Contact & Bio */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="publicEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Public Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="your@email.com"
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
                        <FormLabel>Public Phone</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="+30 210 1234567"
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
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Tell potential clients about yourself..."
                          rows={4}
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

                <FormField
                  control={form.control}
                  name="yearsExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Years of Experience</FormLabel>
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
                <CardTitle className="text-base">Expertise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Specializations</label>
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
                  <label className="text-sm font-medium mb-2 block">Languages</label>
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
                  <label className="text-sm font-medium mb-2 block">Service Areas</label>
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
                      placeholder="e.g., Κολωνάκι"
                      className="max-w-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addServiceArea();
                        }
                      }}
                      disabled={isLoading}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addServiceArea}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium mb-2 block">Certifications</label>
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
                      placeholder="e.g., Licensed Agent"
                      className="max-w-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCertification();
                        }
                      }}
                      disabled={isLoading}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addCertification}>
                      <Plus className="h-4 w-4" />
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
                                Required
                              </label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeField(field.id)}
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
                        <label className="text-sm font-medium mb-1 block">Field Type</label>
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
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-sm font-medium mb-1 block">Field Label</label>
                        <Input
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
                    onClick={handleSaveContactFormSettings}
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
                  onClick={handleSaveContactFormSettings}
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
                <CardDescription>Add links to your social media profiles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="linkedin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://linkedin.com/in/..."
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
                        <FormLabel>Instagram</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://instagram.com/..."
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
                        <FormLabel>Twitter / X</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://twitter.com/..."
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
                        <FormLabel>Facebook</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://facebook.com/..."
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
              Save Profile
            </Button>
          </div>
        </form>
      </Form>
    </Tabs>
  );
}
