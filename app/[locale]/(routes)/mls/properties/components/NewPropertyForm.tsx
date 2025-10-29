"use client";

import { z } from "zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const typeOptions = [
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "LAND", label: "Land" },
  { value: "RENTAL", label: "Rental" },
  { value: "VACATION", label: "Vacation" },
];

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING", label: "Pending" },
  { value: "SOLD", label: "Sold" },
  { value: "OFF_MARKET", label: "Off market" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

export function NewPropertyForm({ onFinish }: { onFinish: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

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
  });

  const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema) });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      await axios.post("/api/mls/properties", data);
      toast({ title: "Success", description: "Property created successfully" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to create property" });
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
        <div className="w-[800px] text-sm space-y-3">
          <FormField control={form.control} name="property_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Property name</FormLabel>
              <FormControl>
                <Input disabled={isLoading} placeholder="123 Main St, City" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="flex gap-5">
            <FormField control={form.control} name="property_type" render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {typeOptions.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="property_status" render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusOptions.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
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
                <FormControl><Input disabled={isLoading} placeholder="123 Main St" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="address_city" render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>City</FormLabel>
                <FormControl><Input disabled={isLoading} placeholder="City" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="flex gap-5">
            <FormField control={form.control} name="address_state" render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>State</FormLabel>
                <FormControl><Input disabled={isLoading} placeholder="State" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="address_zip" render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>ZIP</FormLabel>
                <FormControl><Input disabled={isLoading} placeholder="ZIP" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="flex gap-5">
            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>Price</FormLabel>
                <FormControl><Input type="number" disabled={isLoading} placeholder="500000" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="bedrooms" render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>Bedrooms</FormLabel>
                <FormControl><Input type="number" disabled={isLoading} placeholder="3" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="flex gap-5">
            <FormField control={form.control} name="bathrooms" render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>Bathrooms</FormLabel>
                <FormControl><Input type="number" step="0.5" disabled={isLoading} placeholder="2" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="square_feet" render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>Square feet</FormLabel>
                <FormControl><Input type="number" disabled={isLoading} placeholder="1500" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea disabled={isLoading} placeholder="Property description" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="grid gap-2 py-5"><Button disabled={isLoading} type="submit">Create property</Button></div>
      </form>
    </Form>
  );
}


