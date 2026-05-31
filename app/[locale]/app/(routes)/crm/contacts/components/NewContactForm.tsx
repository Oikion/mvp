"use client";

import { useState } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useTranslations } from "next-intl";

import { useAppToast } from "@/hooks/use-app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";

import { Switch } from "@/components/ui/switch";
import useDebounce from "@/hooks/useDebounce";

//TODO: fix all the types
type NewTaskFormProps = {
  users: any[];
  accounts: any[];
  onFinish: () => void;
};

export function NewContactForm({
  users,
  accounts,
  onFinish,
}: NewTaskFormProps) {
  const router = useRouter();
  const { toast } = useAppToast();
  const t = useTranslations("crm");

  const [searchTerm, setSearchTerm] = useState("");

  const debounceSearchTerm = useDebounce(searchTerm, 1000);

  const filteredData = users.filter((item) =>
    item.name.toLowerCase().includes(debounceSearchTerm.toLowerCase())
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const formSchema = z.object({
    birthday_year: z.string().optional().nullable(),
    birthday_month: z.string().optional().nullable(),
    birthday_day: z.string().optional().nullable(),
    first_name: z.string().optional(),
    last_name: z.string(),
    description: z.string().optional(),
    email: z.string(),
    personal_email: z.string().optional(),
    office_phone: z.string().optional(),
    mobile_phone: z.string().optional(),
    website: z.string().optional(),
    position: z.string().optional(),
    status: z.boolean(),
    type: z.string(),
    assigned_to: z.string(),
    assigned_account: z.string().optional(),
    social_twitter: z.string().optional(),
    social_facebook: z.string().optional(),
    social_linkedin: z.string().optional(),
    social_skype: z.string().optional(),
    social_youtube: z.string().optional(),
    social_tiktok: z.string().optional(),
  });

  type NewAccountFormValues = z.infer<typeof formSchema>;

  const form = useForm<NewAccountFormValues>({
    resolver: zodResolver(formSchema),
  });

  const contactType = [
    { name: t("contacts.legacyForm.contactType.Customer"), id: "Customer" },
    { name: t("contacts.legacyForm.contactType.Partner"), id: "Partner" },
    { name: t("contacts.legacyForm.contactType.Vendor"), id: "Vendor" },
  ];

  const yearArray = Array.from(
    //start in 1923 and count to +100 years
    { length: 100 },
    (_, i) => i + 1923
  );

  const onSubmit = async (data: NewAccountFormValues) => {
    setIsLoading(true);
    try {
      const displayName = [data.first_name, data.last_name].filter(Boolean).join(" ") || data.last_name;
      const categoryMap: Record<string, string> = {
        Customer: "BUYER",
        Partner: "BROKER",
        Vendor: "OTHER",
      };
      await axios.post("/api/crm/contacts", {
        firstName: data.first_name ?? null,
        lastName: data.last_name,
        displayName,
        email: data.email || null,
        secondaryEmail: data.personal_email || null,
        officePhone: data.office_phone || null,
        primaryPhone: data.mobile_phone || null,
        notes: data.description || null,
        status: data.status ? "ACTIVE" : "LEAD",
        category: [categoryMap[data.type] ?? "OTHER"],
        assignedAgentId: data.assigned_to || null,
      });
      toast.success("success", { description: t("contacts.legacyForm.toast.createSuccess") });
      form.reset({
        first_name: "",
        last_name: "",
        description: "",
        email: "",
        personal_email: "",
        office_phone: "",
        mobile_phone: "",
        website: "",
        position: "",
        status: false,
        type: "",
        assigned_to: "",
        assigned_account: "",
        social_twitter: "",
        social_facebook: "",
        social_linkedin: "",
        social_skype: "",
        social_youtube: "",
        social_tiktok: "",
        birthday_year: "",
        birthday_month: "",
        birthday_day: "",
      });
      router.refresh();
      onFinish();
    } catch (error: any) {
      toast.error("error", { description: error?.response?.data });
    } finally {
      setIsLoading(false);
    }
  };

  //console.log(filteredData, "filteredData");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full px-10">
        {/*        <div>
          <pre>
            <code>{JSON.stringify(form.formState, null, 2)}</code>
            <code>{JSON.stringify(form.watch(), null, 2)}</code>
            <code>{JSON.stringify(form.formState.errors, null, 2)}</code>
          </pre>
        </div> */}
        <div className="w-full max-w-[800px] text-sm">
          <div className="pb-5 space-y-2">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contacts.legacyForm.labels.firstName")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder={t("contacts.legacyForm.placeholders.firstName")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contacts.legacyForm.labels.lastName")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder={t("contacts.legacyForm.placeholders.lastName")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mobile_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contacts.legacyForm.labels.mobilePhone")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder={t("contacts.legacyForm.placeholders.phone")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="office_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contacts.legacyForm.labels.officePhone")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder={t("contacts.legacyForm.placeholders.phone")}
                      {...field}
                    />
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
                  <FormLabel>{t("contacts.legacyForm.labels.email")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder={t("contacts.legacyForm.placeholders.email")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="personal_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contacts.legacyForm.labels.personalEmail")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder={t("contacts.legacyForm.placeholders.personalEmail")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contacts.legacyForm.labels.website")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder={t("contacts.legacyForm.placeholders.website")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <h3>{t("contacts.legacyForm.labels.birthday")}</h3>
            <div className="flex space-x-3 w-full mx-auto">
              <FormField
                control={form.control}
                name="birthday_year"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <div className="flex space-x-2 w-32">
                      <Select onValueChange={field.onChange}>
                        <SelectTrigger>{t("contacts.legacyForm.birthday.year")}</SelectTrigger>
                        <SelectContent>
                          {yearArray.map((yearOption) => (
                            <SelectItem
                              key={yearOption}
                              value={yearOption.toString()}
                            >
                              {yearOption}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthday_month"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <div className="flex space-x-2 w-28">
                      <Select onValueChange={field.onChange}>
                        <SelectTrigger>{t("contacts.legacyForm.birthday.month")}</SelectTrigger>
                        <SelectContent>
                          {/* Replace this with the range of months you want to allow */}
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(
                            (monthOption) => (
                              <SelectItem
                                key={monthOption}
                                value={monthOption.toString()}
                              >
                                {monthOption}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthday_day"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <div className="flex space-x-2">
                      <Select onValueChange={field.onChange}>
                        <SelectTrigger>{t("contacts.legacyForm.birthday.day")}</SelectTrigger>
                        <SelectContent>
                          {/* Replace this with the range of months you want to allow */}
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(
                            (dayOption) => (
                              <SelectItem
                                key={dayOption}
                                value={dayOption.toString()}
                              >
                                {dayOption}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contacts.legacyForm.labels.description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={isLoading}
                      placeholder={t("contacts.legacyForm.placeholders.description")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex space-x-5">
              <div className="w-1/2 space-y-2">
                <FormField
                  control={form.control}
                  name="assigned_to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contacts.legacyForm.labels.assignedUser")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("contacts.legacyForm.placeholders.chooseUser")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="h-96 overflow-y-auto">
                          <Input
                            type="text"
                            placeholder={t("contacts.legacyForm.placeholders.searchUsers")}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                          {filteredData.map((item, index) => (
                            <SelectItem key={index} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assigned_account"
                  render={({ field }) => (
                    <FormItem>
                  <FormLabel>{t("contacts.legacyForm.labels.assignClient")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("contacts.legacyForm.placeholders.chooseAccount")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="flex overflow-y-auto h-56">
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name || account.client_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contacts.legacyForm.labels.position")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder={t("contacts.legacyForm.placeholders.position")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          {t("contacts.legacyForm.labels.isContactActive")}
                        </FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contacts.legacyForm.labels.contactType")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("contacts.legacyForm.placeholders.chooseContactType")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="flex overflow-y-auto h-56">
                          {contactType.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="w-1/2 space-y-2">
                <FormField
                  control={form.control}
                  name="social_twitter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contacts.legacyForm.labels.twitter")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder={t("contacts.legacyForm.placeholders.twitter")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="social_facebook"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contacts.legacyForm.labels.facebook")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder={t("contacts.legacyForm.placeholders.facebook")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="social_linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contacts.legacyForm.labels.linkedin")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder={t("contacts.legacyForm.placeholders.linkedin")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="social_skype"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contacts.legacyForm.labels.skype")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder={t("contacts.legacyForm.placeholders.skype")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="social_youtube"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contacts.legacyForm.labels.youtube")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder={t("contacts.legacyForm.placeholders.youtube")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="social_tiktok"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contacts.legacyForm.labels.tiktok")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder={t("contacts.legacyForm.placeholders.tiktok")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-2 py-5">
          <Button disabled={isLoading} type="submit">
            {isLoading ? (
              <span className="flex items-center animate-pulse">
                {t("contacts.legacyForm.buttons.saving")}
              </span>
            ) : (
              t("contacts.legacyForm.buttons.create")
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
