"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import axios from "axios";

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
import { Switch } from "@/components/ui/switch";
import { useAppToast } from "@/hooks/use-app-toast";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  slug: z
    .string()
    .min(3, "URL must be at least 3 characters")
    .max(50, "URL must be less than 50 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "URL can only contain lowercase letters, numbers, and hyphens"
    ),
  bio: z.string().max(1000, "Bio must be less than 1000 characters").optional(),
  publicPhone: z.string().optional(),
  publicEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  yearsExperience: z.coerce.number().min(0).max(70).optional().nullable(),
  isPublic: z.boolean().default(false),
  // Arrays will be handled separately
  specializations: z.array(z.string()).optional(),
  serviceAreas: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  // Social links
  linkedin: z.string().url("Invalid URL").optional().or(z.literal("")),
  instagram: z.string().url("Invalid URL").optional().or(z.literal("")),
  twitter: z.string().url("Invalid URL").optional().or(z.literal("")),
  facebook: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

interface SocialProfileFormProps {
  profile: any;
  suggestedSlug: string;
  userEmail: string;
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

export function SocialProfileForm({
  profile,
  suggestedSlug,
  userEmail,
}: SocialProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newServiceArea, setNewServiceArea] = useState("");
  const [newCertification, setNewCertification] = useState("");
  const router = useRouter();
  const { toast } = useAppToast();
  const t = useTranslations("profile.socialForm");
  const tCommon = useTranslations("common");

  const socialLinks = profile?.socialLinks as Record<string, string> | null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: profile?.slug || suggestedSlug,
      bio: profile?.bio || "",
      publicPhone: profile?.publicPhone || "",
      publicEmail: profile?.publicEmail || userEmail || "",
      yearsExperience: profile?.yearsExperience || null,
      isPublic: profile?.isPublic || false,
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
        slug: data.slug,
        bio: data.bio || null,
        publicPhone: data.publicPhone || null,
        publicEmail: data.publicEmail || null,
        yearsExperience: data.yearsExperience || null,
        isPublic: data.isPublic,
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

      toast.success(t("toast.updated"), { description: data.isPublic ? t("toast.updatedPublic") : t("toast.updatedDesc"), isTranslationKey: false });

      router.refresh();
    } catch (error: any) {
      toast.error(tCommon("toast.error"), { description: error.response?.data || t("toast.errorDesc"), isTranslationKey: false });
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
    form.setValue(
      "serviceAreas",
      current.filter((a) => a !== area)
    );
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
    form.setValue(
      "certifications",
      current.filter((c) => c !== cert)
    );
  };

  const toggleSpecialization = (spec: string) => {
    const current = form.getValues("specializations") || [];
    if (current.includes(spec)) {
      form.setValue(
        "specializations",
        current.filter((s) => s !== spec)
      );
    } else {
      form.setValue("specializations", [...current, spec]);
    }
  };

  const toggleLanguage = (lang: string) => {
    const current = form.getValues("languages") || [];
    if (current.includes(lang)) {
      form.setValue(
        "languages",
        current.filter((l) => l !== lang)
      );
    } else {
      form.setValue("languages", [...current, lang]);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Visibility Toggle */}
        <FormField
          control={form.control}
          name="isPublic"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/50">
              <div className="space-y-0.5">
                <FormLabel className="text-base">{t("makePublic")}</FormLabel>
                <FormDescription>
                  {t("makePublicDescription")}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Profile URL */}
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("profileUrl")}</FormLabel>
              <FormControl>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-muted border border-r-0 rounded-l-md text-sm text-muted-foreground">
                    /agent/
                  </span>
                  <Input
                    {...field}
                    className="rounded-l-none"
                    placeholder={t("slugPlaceholder")}
                    disabled={isLoading}
                  />
                </div>
              </FormControl>
              <FormDescription>
                {t("profileUrlDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t("contactInformation")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="publicEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("publicEmail")}</FormLabel>
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
                  <FormLabel>{t("publicPhone")}</FormLabel>
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
        </div>

        <Separator />

        {/* Bio */}
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("bio")}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={t("bioPlaceholder")}
                  rows={5}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                {t("bioCharacters", { count: field.value?.length || 0 })}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Experience */}
        <FormField
          control={form.control}
          name="yearsExperience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("yearsExperience")}</FormLabel>
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

        <Separator />

        {/* Specializations */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">{t("specializations")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("specializationsHint")}
            </p>
          </div>
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

        {/* Service Areas */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">{t("serviceAreas")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("serviceAreasHint")}
            </p>
          </div>
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
              placeholder={t("serviceAreaPlaceholder")}
              className="max-w-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addServiceArea();
                }
              }}
              disabled={isLoading}
            />
            <Button type="button" variant="outline" size="sm" aria-label={t("addServiceArea")} onClick={addServiceArea}>
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Languages */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">{t("languages")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("languagesHint")}
            </p>
          </div>
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

        {/* Certifications */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">{t("certifications")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("certificationsHint")}
            </p>
          </div>
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
              placeholder={t("certificationPlaceholder")}
              className="max-w-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCertification();
                }
              }}
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={t("addCertification")}
              onClick={addCertification}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Social Links */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">{t("socialLinks")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("socialLinksHint")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="linkedin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="https://linkedin.com/in/yourprofile"
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
                      placeholder="https://instagram.com/yourprofile"
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
                      placeholder="https://twitter.com/yourprofile"
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
                      placeholder="https://facebook.com/yourprofile"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("saveProfile")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

