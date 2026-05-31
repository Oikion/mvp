"use client";

import { z } from "zod";
import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppToast } from "@/hooks/use-app-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
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

const CATEGORIES = [
  "OWNER",
  "BUYER",
  "TENANT",
  "SELLER",
  "INVESTOR",
  "BROKER",
  "COLLEAGUE",
  "NOTARY",
  "LAWYER",
  "ACCOUNTANT",
  "OTHER",
] as const;

function createQuickAddSchema(t: (key: string) => string) {
  return z
    .object({
      displayName: z
        .string()
        .min(1, t("CrmForm.validation.nameRequired"))
        .max(255),
      category: z.enum(CATEGORIES, {
        error: t("CrmForm.validation.personTypeRequired"),
      }),
      email: z.string().optional(),
      primaryPhone: z.string().max(50).optional(),
      assignedAgentId: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const hasEmail = !!data.email?.trim();
      if (
        hasEmail &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email!.trim())
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("CrmForm.validation.emailInvalid"),
          path: ["email"],
        });
      }
    });
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationUsers: { id: string; name: string }[];
  onSuccess?: (contactId?: string) => void;
  onContinueToFull?: () => void;
};

export function QuickAddContact({
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
  const commonT = useTranslations("common");

  const schema = createQuickAddSchema((k: string) => t(k as Parameters<typeof t>[0]));
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: "",
      category: undefined,
      email: "",
      primaryPhone: "",
      assignedAgentId: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const response = await axios.post("/api/crm/contacts", {
        displayName: data.displayName.trim(),
        category: [data.category],
        email: data.email?.trim() || undefined,
        primaryPhone: data.primaryPhone?.trim() || undefined,
        assignedAgentId: data.assignedAgentId || undefined,
        status: "LEAD",
        visibility: "PRIVATE",
      });

      const newContactId = response.data?.data?.id;

      toast.success(t("contacts.quickAdd.create"), {
        description: commonT("toast.createSuccess"),
        isTranslationKey: false,
      });

      form.reset();
      onOpenChange(false);
      router.refresh();

      if (onSuccess) onSuccess(newContactId);
    } catch (error: any) {
      console.error("[QUICK_ADD_CONTACT]", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        commonT("somethingWentWrong");
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
          <SheetTitle>{t("contacts.quickAdd.title")}</SheetTitle>
          <SheetDescription>
            {t("contacts.quickAdd.description")}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden mt-6"
          >
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Display Name */}
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>
                    {t("contacts.quickAdd.displayName")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder={t(
                        "contacts.quickAdd.displayNamePlaceholder"
                      )}
                      autoComplete="name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category (role) */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>
                    {t("contacts.quickAdd.category")}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger disabled={isLoading}>
                        <SelectValue
                          placeholder={t(
                            "contacts.quickAdd.categoryPlaceholder"
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {t(`contacts.category.${cat}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email + Phone row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contacts.quickAdd.email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        disabled={isLoading}
                        placeholder={t("contacts.quickAdd.emailPlaceholder")}
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primaryPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contacts.quickAdd.phone")}</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        disabled={isLoading}
                        placeholder={t("contacts.quickAdd.phonePlaceholder")}
                        autoComplete="tel"
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
              name="assignedAgentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("contacts.quickAdd.assignedAgent")}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger disabled={isLoading}>
                        <SelectValue
                          placeholder={t(
                            "contacts.quickAdd.assignedAgentPlaceholder"
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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

            </div>
            {/* Actions */}
            <div className="flex justify-between gap-4 pt-4 border-t">
              {onContinueToFull && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isLoading}
                  onClick={onContinueToFull}
                >
                  {t("contacts.quickAdd.continueToWizard")}
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={() => onOpenChange(false)}
                >
                  {commonT("cancel")}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center animate-pulse">
                      {commonT("buttonStates.saving")}
                    </span>
                  ) : (
                    t("contacts.quickAdd.create")
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
