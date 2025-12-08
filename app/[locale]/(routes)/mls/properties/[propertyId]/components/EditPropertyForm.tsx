"use client";

import { z } from "zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormGrid } from "@/components/ui/form-layout";

const formSchema = z.object({
  id: z.string().min(1),
  property_name: z.string().min(3),
  property_type: z.string().optional(),
  property_status: z.string().optional(),
  portal_visibility: z.string().optional(),
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
});

export function EditPropertyForm({ initialData }: { initialData: any }) {
  const router = useRouter();
  const t = useTranslations("mls");
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...initialData,
      description: initialData?.description ?? "",
      portal_visibility: initialData?.portal_visibility ?? "PRIVATE",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      await axios.put("/api/mls/properties", data);
    } finally {
      setIsLoading(false);
      router.refresh();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField control={form.control} name="property_name" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("PropertyForm.fields.propertyName")}</FormLabel>
            <FormControl><Input disabled={isLoading} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        
        <FormGrid columns={2}>
          <FormField control={form.control} name="property_type" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("PropertyForm.fields.propertyType")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder={t("PropertyForm.fields.propertyTypePlaceholder")} /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="RESIDENTIAL">{t("PropertyForm.propertyType.RESIDENTIAL")}</SelectItem>
                  <SelectItem value="COMMERCIAL">{t("PropertyForm.propertyType.COMMERCIAL")}</SelectItem>
                  <SelectItem value="LAND">{t("PropertyForm.propertyType.LAND")}</SelectItem>
                  <SelectItem value="RENTAL">{t("PropertyForm.propertyType.RENTAL")}</SelectItem>
                  <SelectItem value="VACATION">{t("PropertyForm.propertyType.VACATION")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="property_status" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("PropertyForm.fields.status")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder={t("PropertyForm.fields.statusPlaceholder")} /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="ACTIVE">{t("PropertyForm.status.ACTIVE")}</SelectItem>
                  <SelectItem value="PENDING">{t("PropertyForm.status.PENDING")}</SelectItem>
                  <SelectItem value="SOLD">{t("PropertyForm.status.SOLD")}</SelectItem>
                  <SelectItem value="OFF_MARKET">{t("PropertyForm.status.OFF_MARKET")}</SelectItem>
                  <SelectItem value="WITHDRAWN">{t("PropertyForm.status.WITHDRAWN")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="portal_visibility" render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Public Visibility</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || "PRIVATE"}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select visibility" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="PRIVATE">Private (Only you)</SelectItem>
                  <SelectItem value="SELECTED">Connections Only</SelectItem>
                  <SelectItem value="PUBLIC">Public (Anyone on the web)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="address_street" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("PropertyForm.fields.street")}</FormLabel>
              <FormControl><Input disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="address_city" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("PropertyForm.fields.city")}</FormLabel>
              <FormControl><Input disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="address_state" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("PropertyForm.fields.state")}</FormLabel>
              <FormControl><Input disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="address_zip" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("PropertyForm.fields.zip")}</FormLabel>
              <FormControl><Input disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="price" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("PropertyForm.fields.price")}</FormLabel>
              <FormControl><Input type="number" disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="bedrooms" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("PropertyForm.fields.bedrooms")}</FormLabel>
              <FormControl><Input type="number" disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="bathrooms" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("PropertyForm.fields.bathrooms")}</FormLabel>
              <FormControl><Input type="number" step="0.5" disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="square_feet" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("PropertyForm.fields.squareFeet")}</FormLabel>
              <FormControl><Input type="number" disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="lot_size" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("PropertyForm.fields.lotSize")}</FormLabel>
              <FormControl><Input type="number" disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="year_built" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("PropertyForm.fields.yearBuilt")}</FormLabel>
              <FormControl><Input type="number" disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </FormGrid>
        
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("PropertyForm.fields.description")}</FormLabel>
            <FormControl>
              <Textarea disabled={isLoading} {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid gap-2 py-2"><Button disabled={isLoading} type="submit">{t("PropertyForm.buttons.update")}</Button></div>
      </form>
    </Form>
  );
}


