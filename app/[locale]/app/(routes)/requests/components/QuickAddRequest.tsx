// @ts-nocheck
"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useContacts } from "@/hooks/swr";
import { createRequest } from "@/actions/requests/create-request";
import { useRouter } from "next/navigation";
import { useAppToast } from "@/hooks/use-app-toast";

const quickAddSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  contactId: z.string().optional(),
  requestType: z.enum(["BUY", "RENT"]),
  budgetMin: z.union([z.literal(""), z.coerce.number().min(0)]).optional(),
  budgetMax: z.union([z.literal(""), z.coerce.number().min(0)]).optional(),
  locationDisplayName: z.string().optional(),
  assignedAgentId: z.string().optional(),
});

type QuickAddFormValues = z.infer<typeof quickAddSchema>;

interface QuickAddRequestProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationUsers: any[];
  onContinueToFull?: () => void;
  onSuccess?: () => void;
}

export function QuickAddRequest({
  open,
  onOpenChange,
  organizationUsers,
  onContinueToFull,
  onSuccess,
}: Readonly<QuickAddRequestProps>) {
  const t = useTranslations("requests");
  const commonT = useTranslations("common");
  const router = useRouter();
  const { toast } = useAppToast();
  const { contacts: contactOptions } = useContacts();

  const form = useForm<QuickAddFormValues>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      name: "",
      contactId: "",
      requestType: "BUY",
      budgetMin: "",
      budgetMax: "",
      locationDisplayName: "",
      assignedAgentId: "",
    },
  });

  const onSubmit = async (values: QuickAddFormValues) => {
    const result = await createRequest({
      name: values.name.trim(),
      contactId: values.contactId,
      requestType: values.requestType,
      budgetMin: typeof values.budgetMin === "number" ? values.budgetMin : null,
      budgetMax: typeof values.budgetMax === "number" ? values.budgetMax : null,
      locationDisplayName: values.locationDisplayName || null,
      assignedAgentId: values.assignedAgentId || null,
    } as Parameters<typeof createRequest>[0]);

    if (result.success) {
      toast.success(t("toast.created"), {
        description: t("toast.createdDesc"),
        isTranslationKey: false,
      });
      form.reset();
      onOpenChange(false);
      router.refresh();
      onSuccess?.();
    } else {
      toast.error(result.error || t("toast.createError"), {
        isTranslationKey: false,
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[500px] flex flex-col">
        <SheetHeader>
          <SheetTitle>{t("quickAdd.title")}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden mt-6">
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Title — required, first field so it's the most prominent */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("quickAdd.titleLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("quickAdd.titlePlaceholder")}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact selector */}
            <FormField
              control={form.control}
              name="contactId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("quickAdd.contactLabel")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("quickAdd.contactPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contactOptions.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Request type */}
            <FormField
              control={form.control}
              name="requestType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("quickAdd.requestTypeLabel")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BUY">{t("requestType.BUY")}</SelectItem>
                      <SelectItem value="RENT">{t("requestType.RENT")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Budget range */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="budgetMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("quickAdd.budgetMinLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="budgetMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("quickAdd.budgetMaxLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Location */}
            <FormField
              control={form.control}
              name="locationDisplayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("quickAdd.locationLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("quickAdd.locationPlaceholder")}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assigned agent */}
            <FormField
              control={form.control}
              name="assignedAgentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("quickAdd.assignedToLabel")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("quickAdd.assignedToPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {organizationUsers.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            </div>

            {/* Footer — matches QuickAddContact pattern */}
            <div className="flex justify-between gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={onContinueToFull}
              >
                {t("quickAdd.continueToFull")}
              </Button>
              <div className="flex gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {commonT("cancel")}
                </Button>
                <Button type="submit">
                  {t("quickAdd.submit")}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
