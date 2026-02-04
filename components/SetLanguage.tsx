"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAppToast } from "@/hooks/use-app-toast";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import LoadingModal from "./modals/loading-modal";
import { availableLocales } from "@/lib/locales";

// Dynamically generate languages list from available locales
const languages = availableLocales.map((locale) => ({
  label: locale.name,
  value: locale.code,
}));

const FormSchema = (t: (key: string) => string) => z.object({
  language: z.string({
    required_error: t("setLanguage.languageRequired"),
  }),
});

type Props = {
  userId: string;
};

export function SetLanguage({ userId }: Props) {
  const router = useRouter();
  const t = useTranslations();
  const tCommon = useTranslations("common");
  const { toast } = useAppToast();

  const form = useForm<z.infer<ReturnType<typeof FormSchema>>>({
    resolver: zodResolver(FormSchema(t)),
  });

  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(data: z.infer<ReturnType<typeof FormSchema>>) {
    setIsLoading(true);
    try {
      await axios.put(`/api/user/${userId}/set-language`, data);
      toast.success("success", { description: t("setLanguage.languageChanged") });
    } catch (e) {
      toast.error("error", { description: tCommon("error") });
    } finally {
      router.refresh();
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <LoadingModal
        isOpen={isLoading}
        description={t("setLanguage.changingLanguage")}
      />
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="hidden lg:block space-y-6"
      >
        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-[200px] justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? languages.find(
                            (language) => language.value === field.value
                          )?.label
                        : t("setLanguage.selectLanguagePlaceholder")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder={t("setLanguage.searchLanguage")} />
                    <CommandList>
                      <CommandEmpty>{t("setLanguage.noLanguageFound")}</CommandEmpty>
                      <CommandGroup>
                        {languages.map((language) => (
                          <CommandItem
                            value={language.value}
                            key={language.value}
                            onSelect={(value) => {
                              form.setValue("language", value);
                              onSubmit(form.getValues());
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                language.value === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {language.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
