"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@clerk/nextjs";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
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
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/ui/icons";

const FormSchema = z.object({
  email: z.string().email(),
  role: z.enum(["org:owner", "org:lead", "org:member", "org:viewer"]),
});

export function OrganizationInviteForm() {
  const t = useTranslations("admin");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();
  const { toast } = useToast();
  const { organization } = useOrganization();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      role: "org:member",
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    if (!organization) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("noOrgContext"),
      });
      return;
    }

    setIsLoading(true);
    try {
      await organization.inviteMember({
        emailAddress: data.email,
        role: data.role,
      });

      toast({
        variant: "success",
        title: t("invitationSent"),
        description: t("invitationSentDescription", { email: data.email }),
      });

      form.reset({
        email: "",
        role: "org:member",
      });
      router.refresh();
    } catch (error: any) {
      console.error("Invitation error:", error);
      
      let errorMessage = t("invitationError");
      if (error?.errors?.[0]?.message) {
        errorMessage = error.errors[0].message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        variant: "destructive",
        title: t("error"),
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-5 w-full p-5 items-end"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="w-full sm:w-1/2">
              <FormLabel>{t("emailAddress")}</FormLabel>
              <FormControl>
                <Input
                  disabled={isLoading}
                  placeholder={t("emailPlaceholder")}
                  type="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem className="w-full sm:w-[200px]">
              <FormLabel>{t("role")}</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectRole")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="org:viewer">{t("roleViewer") || "Viewer"}</SelectItem>
                  <SelectItem value="org:member">{t("roleMember")}</SelectItem>
                  <SelectItem value="org:lead">{t("roleLead") || "Lead"}</SelectItem>
                  <SelectItem value="org:owner">{t("roleOwner") || "Owner"}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="w-full sm:w-[180px]" type="submit" disabled={isLoading}>
          {isLoading ? (
            <Icons.spinner className="animate-spin" />
          ) : (
            t("sendInvitation")
          )}
        </Button>
      </form>
    </Form>
  );
}
