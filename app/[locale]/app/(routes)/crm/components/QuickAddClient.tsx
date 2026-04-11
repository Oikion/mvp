"use client";

import { z } from "zod";
import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppToast } from "@/hooks/use-app-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations, useLocale } from "next-intl";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const createQuickAddClientSchema = (
  t: (key: string) => string,
  tCommon: (key: string) => string
) =>
  z
    .object({
      client_name: z.string().min(1, t("CrmForm.validation.nameRequired")),
      person_type: z.enum(["INDIVIDUAL", "COMPANY", "INVESTOR", "BROKER"], { required_error: t("CrmForm.validation.personTypeRequired") }),
      primary_email: z.string().optional(),
      primary_phone: z.string().optional(),
      assigned_to: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const hasEmail = !!data.primary_email?.trim();
      if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.primary_email!.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid email address",
          path: ["primary_email"],
        });
      }
    });

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationUsers: { id: string; name: string }[];
  locale?: string;
  onSuccess?: (clientId?: string) => void;
  onContinueToFull?: () => void;
};

export function QuickAddClient({
  open,
  onOpenChange,
  organizationUsers,
  onSuccess,
  onContinueToFull,
}: Props) {
  const router = useRouter();
  const { toast } = useAppToast();
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("crm");
  const locale = useLocale();
  const tCommon = useTranslations("common");

  const quickAddClientSchema = createQuickAddClientSchema(
    (k: string) => t(k as Parameters<typeof t>[0]),
    (k: string) => tCommon(k as Parameters<typeof tCommon>[0]),
  );
  type QuickAddClientFormValues = z.infer<typeof quickAddClientSchema>;

  const form = useForm<QuickAddClientFormValues>({
    resolver: zodResolver(quickAddClientSchema),
    defaultValues: {
      client_name: "",
      person_type: undefined,
      primary_email: "",
      primary_phone: "",
      assigned_to: "",
    },
  });

  const onSubmit = async (data: QuickAddClientFormValues) => {
    setIsLoading(true);
    try {
      const response = await axios.post("/api/crm/contacts", {
        client_name: data.client_name?.trim() || undefined,
        person_type: data.person_type || undefined,
        primary_email: data.primary_email?.trim() || undefined,
        primary_phone: data.primary_phone?.trim() || undefined,
        assigned_to: data.assigned_to || undefined,
        draft_status: false,
      });

      const newClientId = response.data?.newClient?.id;

      toast.success("createSuccess", { description: tCommon("clientCreated") });

      form.reset();
      onOpenChange(false);
      router.refresh();

      if (onSuccess) {
        onSuccess(newClientId);
      }
      if (onContinueToFull) {
        onContinueToFull();
      }
    } catch (error: any) {
      console.error("Error creating client:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data ||
        error?.message ||
        tCommon("somethingWentWrong");
      toast.error(
        typeof errorMessage === "string" ? errorMessage : String(errorMessage),
        { isTranslationKey: false }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] flex flex-col">
        <SheetHeader>
          <SheetTitle>{t("QuickAdd.client.title")}</SheetTitle>
          <SheetDescription>{t("QuickAdd.client.description")}</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 space-y-4 mt-6"
          >
            {/* Client Name */}
            <FormField
              control={form.control}
              name="client_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("CrmForm.fields.fullName")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder={t("CrmForm.fields.fullNamePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Person Type */}
            <FormField
              control={form.control}
              name="person_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("CrmForm.fields.personType")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger disabled={isLoading}>
                        <SelectValue placeholder={t("CrmForm.fields.personTypePlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="INDIVIDUAL">
                        {t("CrmForm.personType.INDIVIDUAL")}
                      </SelectItem>
                      <SelectItem value="COMPANY">
                        {t("CrmForm.personType.COMPANY")}
                      </SelectItem>
                      <SelectItem value="INVESTOR">
                        {t("CrmForm.personType.INVESTOR")}
                      </SelectItem>
                      <SelectItem value="BROKER">
                        {t("CrmForm.personType.BROKER")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email + Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="primary_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.fields.primaryEmail")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        disabled={isLoading}
                        placeholder={t("CrmForm.fields.primaryEmailPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primary_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.fields.primaryPhone")}</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        disabled={isLoading}
                        placeholder={t("CrmForm.fields.primaryPhonePlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Assigned Agent */}
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.agentOwner")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger disabled={isLoading}>
                        <SelectValue placeholder={tCommon("selectAgent")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="overflow-y-auto h-56">
                      {organizationUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action buttons */}
            <div className="flex justify-between gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? tCommon("creating") : t("CrmForm.buttons.quickAdd")}
              </Button>
            </div>

          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
