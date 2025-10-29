"use client";

import { z } from "zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
  id: z.string().min(1),
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
});

export function EditPropertyForm({ initialData }: { initialData: any }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...initialData,
      description: initialData?.description ?? "",
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
            <FormLabel>Property name</FormLabel>
            <FormControl><Input disabled={isLoading} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex gap-5">
          <FormField control={form.control} name="property_type" render={({ field }) => (
            <FormItem className="w-1/2">
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                  <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                  <SelectItem value="LAND">Land</SelectItem>
                  <SelectItem value="RENTAL">Rental</SelectItem>
                  <SelectItem value="VACATION">Vacation</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="property_status" render={({ field }) => (
            <FormItem className="w-1/2">
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SOLD">Sold</SelectItem>
                  <SelectItem value="OFF_MARKET">Off market</SelectItem>
                  <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="flex gap-5">
          <FormField control={form.control} name="address_street" render={({ field }) => (
            <FormItem className="w-1/2">
              <FormLabel>Street</FormLabel>
              <FormControl><Input disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="address_city" render={({ field }) => (
            <FormItem className="w-1/2">
              <FormLabel>City</FormLabel>
              <FormControl><Input disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="flex gap-5">
          <FormField control={form.control} name="address_state" render={({ field }) => (
            <FormItem className="w-1/2">
              <FormLabel>State</FormLabel>
              <FormControl><Input disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="address_zip" render={({ field }) => (
            <FormItem className="w-1/2">
              <FormLabel>ZIP</FormLabel>
              <FormControl><Input disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="flex gap-5">
          <FormField control={form.control} name="price" render={({ field }) => (
            <FormItem className="w-1/2">
              <FormLabel>Price</FormLabel>
              <FormControl><Input type="number" disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="bedrooms" render={({ field }) => (
            <FormItem className="w-1/2">
              <FormLabel>Bedrooms</FormLabel>
              <FormControl><Input type="number" disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="flex gap-5">
          <FormField control={form.control} name="bathrooms" render={({ field }) => (
            <FormItem className="w-1/2">
              <FormLabel>Bathrooms</FormLabel>
              <FormControl><Input type="number" step="0.5" disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="square_feet" render={({ field }) => (
            <FormItem className="w-1/2">
              <FormLabel>Square feet</FormLabel>
              <FormControl><Input type="number" disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="flex gap-5">
          <FormField control={form.control} name="lot_size" render={({ field }) => (
            <FormItem className="w-1/2">
              <FormLabel>Lot size</FormLabel>
              <FormControl><Input type="number" disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="year_built" render={({ field }) => (
            <FormItem className="w-1/2">
              <FormLabel>Year built</FormLabel>
              <FormControl><Input type="number" disabled={isLoading} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea disabled={isLoading} {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid gap-2 py-2"><Button disabled={isLoading} type="submit">Update property</Button></div>
      </form>
    </Form>
  );
}


