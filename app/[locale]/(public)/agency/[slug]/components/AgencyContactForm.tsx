"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { submitAgencyContactForm } from "@/actions/organization/agency-contact-form";
import type { ContactFormField } from "@/lib/contact-form-types";

interface AgencyContactFormProps {
  profileSlug: string;
  agencyName: string;
  contactFormFields?: ContactFormField[];
}

const defaultSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export function AgencyContactForm({
  profileSlug,
  agencyName,
  contactFormFields: _contactFormFields,
}: AgencyContactFormProps) {
  const tProfile = useTranslations("profile");
  const t = (k: string) => tProfile(`contactForm.${k}` as Parameters<typeof tProfile>[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<z.infer<typeof defaultSchema>>({
    resolver: zodResolver(defaultSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  async function onSubmit(values: z.infer<typeof defaultSchema>) {
    setIsSubmitting(true);
    try {
      const result = await submitAgencyContactForm(profileSlug, values);
      if (result.success) {
        setSubmitted(true);
        toast.success(t("successMessage"));
        form.reset();
      } else {
        toast.error(result.error || t("errorMessage"));
      }
    } catch (error) {
      console.error("[AGENCY_CONTACT_FORM]", error);
      toast.error(t("errorMessage"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Send className="h-6 w-6 text-primary" aria-hidden />
        </div>
        <h3 className="text-lg font-semibold">{t("thankYou")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t("confirmationMessage")}</p>
        <Button
          variant="outline"
          onClick={() => setSubmitted(false)}
          className="mt-6"
        >
          {t("sendAnother")}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="mb-4 text-xl font-semibold">
        {t("title")} {agencyName}
      </h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("name")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("namePlaceholder")} {...field} />
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
                <FormLabel>{t("email")}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("message")}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("messagePlaceholder")}
                    rows={5}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                {t("sending")}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" aria-hidden />
                {t("send")}
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
