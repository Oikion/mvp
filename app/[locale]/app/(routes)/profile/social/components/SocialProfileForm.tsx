"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/components/ui/use-toast";
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
  const { toast } = useToast();

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

      toast({
        variant: "success",
        title: "Profile Updated",
        description: data.isPublic
          ? "Your profile is now live and visible to the public."
          : "Your profile has been saved but is not yet public.",
      });

      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.response?.data || "Failed to update profile. Please try again.",
      });
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
                <FormLabel className="text-base">Make Profile Public</FormLabel>
                <FormDescription>
                  When enabled, your profile will be visible to anyone with the link
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
              <FormLabel>Profile URL *</FormLabel>
              <FormControl>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-muted border border-r-0 rounded-l-md text-sm text-muted-foreground">
                    /agent/
                  </span>
                  <Input
                    {...field}
                    className="rounded-l-none"
                    placeholder="your-name"
                    disabled={isLoading}
                  />
                </div>
              </FormControl>
              <FormDescription>
                This will be your public profile URL. Use lowercase letters, numbers, and
                hyphens only.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        <Separator />

        {/* Bio */}
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Tell potential clients about yourself, your experience, and what makes you unique..."
                  rows={5}
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

        {/* Experience */}
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

        <Separator />

        {/* Specializations */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Specializations</h3>
            <p className="text-sm text-muted-foreground">
              Select the types of properties you specialize in
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
            <h3 className="text-lg font-medium">Service Areas</h3>
            <p className="text-sm text-muted-foreground">
              Add the areas/neighborhoods where you operate
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
              placeholder="e.g., Κολωνάκι, Γλυφάδα"
              className="max-w-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addServiceArea();
                }
              }}
              disabled={isLoading}
            />
            <Button type="button" variant="outline" size="sm" onClick={addServiceArea}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Languages */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Languages</h3>
            <p className="text-sm text-muted-foreground">
              Select the languages you speak
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
            <h3 className="text-lg font-medium">Certifications</h3>
            <p className="text-sm text-muted-foreground">
              Add your professional certifications and qualifications
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
              placeholder="e.g., Licensed Real Estate Agent"
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
              onClick={addCertification}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Social Links */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Social Links</h3>
            <p className="text-sm text-muted-foreground">
              Add links to your social media profiles
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
            Save Profile
          </Button>
        </div>
      </form>
    </Form>
  );
}

