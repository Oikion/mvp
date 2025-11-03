"use client";

import { z } from "zod";
import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
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

const createQuickAddSchema = (t: (key: string) => string) => z.object({
  person_type: z.enum(["INDIVIDUAL", "COMPANY", "INVESTOR", "BROKER"], {
    required_error: t("CrmForm.validation.personTypeRequired"),
  }),
  full_name: z.string().optional(),
  company_name: z.string().optional(),
  primary_phone: z.string().optional(),
  primary_email: z.string().email().optional().or(z.literal("")),
  intent: z.enum(["BUY", "RENT", "SELL", "LEASE", "INVEST"], {
    required_error: t("CrmForm.validation.intentRequired"),
  }),
  assigned_to: z.string().min(1, t("common.selectAgent")),
}).refine(
  (data) => {
    return !!(data.primary_phone && data.primary_phone.length) || !!(data.primary_email && data.primary_email.length);
  },
  {
    path: ["primary_email"],
    message: t("CrmForm.validation.phoneOrEmailRequired"),
  }
).refine(
  (data) => {
    if (data.person_type === "INDIVIDUAL") {
      return !!(data.full_name && data.full_name.length);
    }
    if (data.person_type === "COMPANY") {
      return !!(data.company_name && data.company_name.length);
    }
    return true;
  },
  {
    path: ["full_name"],
    message: t("CrmForm.validation.nameRequired"),
  }
);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: any[];
  onContinueToFull?: (clientId: string) => void;
};

export function QuickAddClient({ open, onOpenChange, users, onContinueToFull }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations();
  
  const quickAddSchema = createQuickAddSchema(t);
  type QuickAddFormValues = z.infer<typeof quickAddSchema>;

  const form = useForm<QuickAddFormValues>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      person_type: undefined,
      full_name: "",
      company_name: "",
      primary_phone: "",
      primary_email: "",
      intent: undefined,
      assigned_to: "",
    },
  });

  const personType = form.watch("person_type");

  const onSubmit = async (data: QuickAddFormValues) => {
    setIsLoading(true);
    try {
      const client_name = data.person_type === "COMPANY" 
        ? data.company_name || "Unnamed Company"
        : data.full_name || "Unnamed Client";

      const response = await axios.post("/api/crm/clients", {
        ...data,
        client_name,
        draft_status: false, // Quick add creates final client
      });

      const clientId = response.data.newClient.id;

      toast({
        title: t("common.success"),
        description: t("common.clientCreated"),
      });

      form.reset();
      onOpenChange(false);
      router.refresh();

      // If callback provided, call it with the new client ID
      if (onContinueToFull) {
        onContinueToFull(clientId);
      }
    } catch (error: any) {
      console.error("Error creating client:", error);
      const errorMessage = error?.response?.data?.error || error?.response?.data || error?.message || t("common.somethingWentWrong");
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: typeof errorMessage === 'string' ? errorMessage : t("common.clientCreationFailed"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle>{t("QuickAdd.client.title")}</SheetTitle>
          <SheetDescription>
            {t("QuickAdd.client.description")}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
            <FormField
              control={form.control}
              name="person_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.personType")} *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("CrmForm.fields.personTypePlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="INDIVIDUAL">{t("CrmForm.personType.INDIVIDUAL")}</SelectItem>
                      <SelectItem value="COMPANY">{t("CrmForm.personType.COMPANY")}</SelectItem>
                      <SelectItem value="INVESTOR">{t("CrmForm.personType.INVESTOR")}</SelectItem>
                      <SelectItem value="BROKER">{t("CrmForm.personType.BROKER")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {personType === "INDIVIDUAL" && (
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.fields.fullName")} *</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder={t("CrmForm.fields.fullNamePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {personType === "COMPANY" && (
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.fields.companyName")} *</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder={t("CrmForm.fields.companyNamePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="primary_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.fields.primaryPhone")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder={t("CrmForm.fields.primaryPhonePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primary_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.fields.primaryEmail")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} type="email" placeholder={t("CrmForm.fields.primaryEmailPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="intent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.intent")} *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("CrmForm.fields.intentPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BUY">{t("CrmForm.intents.BUY")}</SelectItem>
                      <SelectItem value="RENT">{t("CrmForm.intents.RENT")}</SelectItem>
                      <SelectItem value="SELL">{t("CrmForm.intents.SELL")}</SelectItem>
                      <SelectItem value="LEASE">{t("CrmForm.intents.LEASE")}</SelectItem>
                      <SelectItem value="INVEST">{t("CrmForm.intents.INVEST")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.agentOwner")} *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("common.selectAgent")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="overflow-y-auto h-56">
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t("common.creating") : t("CrmForm.buttons.quickAdd")}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

