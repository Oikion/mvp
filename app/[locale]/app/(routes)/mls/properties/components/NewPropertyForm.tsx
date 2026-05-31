"use client";

import { z } from "zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

import { useAppToast } from "@/hooks/use-app-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const typeOptions = [
  { value: "RESIDENTIAL", labelKey: "typeOptions.residential" },
  { value: "COMMERCIAL", labelKey: "typeOptions.commercial" },
  { value: "LAND", labelKey: "typeOptions.land" },
  { value: "RENTAL", labelKey: "typeOptions.rental" },
  { value: "VACATION", labelKey: "typeOptions.vacation" },
] as const;

const statusOptions = [
  { value: "ACTIVE", labelKey: "statusOptions.active" },
  { value: "PENDING", labelKey: "statusOptions.pending" },
  { value: "SOLD", labelKey: "statusOptions.sold" },
  { value: "OFF_MARKET", labelKey: "statusOptions.offMarket" },
  { value: "WITHDRAWN", labelKey: "statusOptions.withdrawn" },
] as const;

export function NewPropertyForm({ onFinish }: { onFinish: () => void }) {
  const router = useRouter();
  const t = useTranslations("mls.NewPropertyForm");
  const { toast } = useAppToast();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const formSchema = z.object({
    property_name: z.string().min(3),
    property_type: z.string().optional(),
    property_status: z.string().optional(),
    address_street: z.string().optional(),
    address_city: z.string().optional(),
    address_state: z.string().optional(),
    address_zip: z.string().optional(),
    price: z.coerce.number().int().positive().optional(),
    bedrooms: z.coerce.number().int().min(0).optional(),
    bathrooms: z.coerce.number().min(0).optional(),
    square_feet: z.coerce.number().int().min(0).optional(),
    lot_size: z.coerce.number().min(0).optional(),
    year_built: z.coerce.number().int().optional(),
    description: z.string().optional(),
    clientIds: z.array(z.string()).optional().default([]),
  });

  const form = useForm<z.infer<typeof formSchema>>({ 
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientIds: [],
    },
  });

  // Fetch clients on component mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await axios.get("/api/crm/clients");
        setClients(response.data || []);
      } catch (error) {
        console.error("Failed to fetch clients:", error);
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClients();
  }, []);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      // Create the property first
      const propertyResponse = await axios.post("/api/mls/properties", {
        property_name: data.property_name,
        property_type: data.property_type,
        property_status: data.property_status,
        address_street: data.address_street,
        address_city: data.address_city,
        address_state: data.address_state,
        address_zip: data.address_zip,
        price: data.price,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        square_feet: data.square_feet,
        lot_size: data.lot_size,
        year_built: data.year_built,
        description: data.description,
      });

      const propertyId = propertyResponse.data.newProperty.id;

      // Link clients if any are selected
      if (data.clientIds && data.clientIds.length > 0) {
        await axios.put("/api/crm/clients/link-properties", {
          propertyId,
          clientIds: data.clientIds,
        });
      }

      toast.success(t("toast.created"), { description: t("toast.createdDesc"), isTranslationKey: false });
    } catch (e) {
      toast.error(t("toast.error"), { description: t("toast.errorDesc"), isTranslationKey: false });
    } finally {
      form.reset();
      router.refresh();
      onFinish();
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full px-10">
        <div className="w-full max-w-[800px] text-sm space-y-3">
          <FormField control={form.control} name="property_name" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.name")}</FormLabel>
              <FormControl>
                <Input disabled={isLoading} placeholder={t("placeholders.name")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="flex gap-5">
            <FormField control={form.control} name="property_type" render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>{t("fields.type")}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("placeholders.type")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {typeOptions.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="property_status" render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>{t("fields.status")}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("placeholders.status")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusOptions.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="flex gap-5">
            <FormField control={form.control} name="address_street" render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>{t("fields.street")}</FormLabel>
                <FormControl><Input disabled={isLoading} placeholder={t("placeholders.street")} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="address_city" render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>{t("fields.city")}</FormLabel>
                <FormControl><Input disabled={isLoading} placeholder={t("placeholders.city")} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="flex gap-5">
            <FormField control={form.control} name="address_state" render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>{t("fields.state")}</FormLabel>
                <FormControl><Input disabled={isLoading} placeholder={t("placeholders.state")} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="address_zip" render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>{t("fields.zip")}</FormLabel>
                <FormControl><Input disabled={isLoading} placeholder={t("placeholders.zip")} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="flex gap-5">
            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>{t("fields.price")}</FormLabel>
                <FormControl><Input type="number" disabled={isLoading} placeholder={t("placeholders.price")} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="bedrooms" render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>{t("fields.bedrooms")}</FormLabel>
                <FormControl><Input type="number" disabled={isLoading} placeholder={t("placeholders.bedrooms")} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="flex gap-5">
            <FormField control={form.control} name="bathrooms" render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>{t("fields.bathrooms")}</FormLabel>
                <FormControl><Input type="number" step="0.5" disabled={isLoading} placeholder={t("placeholders.bathrooms")} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="square_feet" render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>{t("fields.squareFeet")}</FormLabel>
                <FormControl><Input type="number" disabled={isLoading} placeholder={t("placeholders.squareFeet")} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.description")}</FormLabel>
              <FormControl>
                <Textarea disabled={isLoading} placeholder={t("placeholders.description")} {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground mb-4">
              {t("linkClientsHint")}
            </div>
            {loadingClients ? (
              <div className="text-sm text-muted-foreground">{t("loadingClients")}</div>
            ) : clients.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t("noClients")}</div>
            ) : (
              <FormField
                control={form.control}
                name="clientIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.linkToClients")}</FormLabel>
                    <FormControl>
                      <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-4">
                        {clients.map((client) => (
                          <div key={client.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`client-${client.id}`}
                              checked={field.value?.includes(client.id) || false}
                              onCheckedChange={(checked) => {
                                const currentValues = field.value || [];
                                if (checked) {
                                  field.onChange([...currentValues, client.id]);
                                } else {
                                  field.onChange(currentValues.filter((id) => id !== client.id));
                                }
                              }}
                            />
                            <label
                              htmlFor={`client-${client.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                            >
                              <div className="font-medium">{client.client_name}</div>
                              {client.primary_email && (
                                <div className="text-xs text-muted-foreground">{client.primary_email}</div>
                              )}
                              {client.client_status && (
                                <div className="text-xs text-muted-foreground capitalize">{client.client_status.toLowerCase()}</div>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>
        <div className="grid gap-2 py-5"><Button disabled={isLoading} type="submit">{t("submit")}</Button></div>
      </form>
    </Form>
  );
}


