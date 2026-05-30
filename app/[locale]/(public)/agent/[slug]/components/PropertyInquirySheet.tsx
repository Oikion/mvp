"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

interface PropertyInquirySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentUsername: string;
  agentName: string;
  locale: string;
}

const inquirySchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  propertyType: z.string().min(1, "Property type is required"),
  location: z.string().min(2, "Location is required"),
  budget: z.string().optional(),
  bedrooms: z.string().optional(),
  timeline: z.string().min(1, "Timeline is required"),
  message: z.string().optional(),
  privacyConsent: z.boolean().refine((val) => val === true, {
    message: "You must accept the privacy policy",
  }),
});

type InquiryFormData = z.infer<typeof inquirySchema>;

export function PropertyInquirySheet({
  open,
  onOpenChange,
  agentUsername,
  agentName,
  locale,
}: PropertyInquirySheetProps) {
  const t = useTranslations("profile");
  const { user, isLoaded } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      name: user?.fullName || "",
      email: user?.primaryEmailAddress?.emailAddress || "",
      phone: "",
      propertyType: "",
      location: "",
      budget: "",
      bedrooms: "",
      timeline: "",
      message: "",
      privacyConsent: false,
    },
  });

  useEffect(() => {
    if (isLoaded && user && !form.getValues("name")) {
      form.setValue("name", user.fullName || "");
      form.setValue("email", user.primaryEmailAddress?.emailAddress || "");
    }
  }, [isLoaded, user, form]);

  const onSubmit = async (data: InquiryFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/agent/${agentUsername}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit inquiry");
      }

      setIsSuccess(true);
      form.reset();
    } catch (err: unknown) {
      setError((err as Error).message || t("agentProfile.inquiryError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after animation
    setTimeout(() => {
      setIsSuccess(false);
      setError(null);
      form.reset();
    }, 300);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:min-w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("agentProfile.inquiryForm.title")}</SheetTitle>
          <SheetDescription>
            {t("agentProfile.inquiryForm.description", { agentName })}
          </SheetDescription>
        </SheetHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-success/10 p-3 mb-4">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {t("agentProfile.inquirySuccess")}
            </h3>
            <p className="text-muted-foreground mb-6">
              {t("agentProfile.inquirySuccessDesc", { agentName })}
            </p>
            <Button onClick={handleClose}>
              {t("agentProfile.inquiryForm.close")}
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6" noValidate>
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("agentProfile.inquiryForm.contactInfo")}
                </h3>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("agentProfile.inquiryForm.name")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t("agentProfile.inquiryForm.namePlaceholder")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("agentProfile.inquiryForm.email")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder={t("agentProfile.inquiryForm.emailPlaceholder")} />
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
                      <FormLabel>{t("agentProfile.inquiryForm.phone")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t("agentProfile.inquiryForm.phonePlaceholder")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Property Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("agentProfile.inquiryForm.propertyDetails")}
                </h3>

                <FormField
                  control={form.control}
                  name="propertyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("agentProfile.inquiryForm.propertyType")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("agentProfile.inquiryForm.propertyTypePlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="apartment">{t("agentProfile.inquiryForm.apartment")}</SelectItem>
                          <SelectItem value="house">{t("agentProfile.inquiryForm.house")}</SelectItem>
                          <SelectItem value="commercial">{t("agentProfile.inquiryForm.commercial")}</SelectItem>
                          <SelectItem value="land">{t("agentProfile.inquiryForm.land")}</SelectItem>
                          <SelectItem value="other">{t("agentProfile.inquiryForm.other")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("agentProfile.inquiryForm.location")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t("agentProfile.inquiryForm.locationPlaceholder")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("agentProfile.inquiryForm.budget")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t("agentProfile.inquiryForm.budgetPlaceholder")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("agentProfile.inquiryForm.bedrooms")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t("agentProfile.inquiryForm.bedroomsPlaceholder")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("agentProfile.inquiryForm.timeline")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("agentProfile.inquiryForm.timelinePlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="immediate">{t("agentProfile.inquiryForm.immediate")}</SelectItem>
                          <SelectItem value="1-3months">{t("agentProfile.inquiryForm.oneToThreeMonths")}</SelectItem>
                          <SelectItem value="3-6months">{t("agentProfile.inquiryForm.threeToSixMonths")}</SelectItem>
                          <SelectItem value="6+months">{t("agentProfile.inquiryForm.sixPlusMonths")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("agentProfile.inquiryForm.message")}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder={t("agentProfile.inquiryForm.messagePlaceholder")}
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Privacy Consent */}
              <FormField
                control={form.control}
                name="privacyConsent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">
                        {t("agentProfile.inquiryForm.privacyPrefix")}{" "}
                        <Link
                          href={`/${locale}/legal/privacy-policy`}
                          className="text-primary hover:underline"
                          target="_blank"
                        >
                          {t("agentProfile.inquiryForm.privacyLinkText")}
                        </Link>
                        {t("agentProfile.inquiryForm.privacySuffix")}
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {t("agentProfile.inquiryForm.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("agentProfile.inquiryForm.sending")}
                    </>
                  ) : (
                    t("agentProfile.inquiryForm.submit")
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  );
}
