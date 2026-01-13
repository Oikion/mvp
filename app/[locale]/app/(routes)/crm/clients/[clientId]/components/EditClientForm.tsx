"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";

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

const clientTypeOptions = [
  { value: "BUYER", label: "Buyer" },
  { value: "SELLER", label: "Seller" },
  { value: "RENTER", label: "Renter" },
  { value: "INVESTOR", label: "Investor" },
  { value: "REFERRAL_PARTNER", label: "Referral Partner" },
];

const clientStatusOptions = [
  { value: "LEAD", label: "Lead" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "CONVERTED", label: "Converted" },
  { value: "LOST", label: "Lost" },
];

export function EditClientForm({ initialData }: { initialData: any }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const formSchema = z.object({
    id: z.string().min(1),
    client_name: z.string().min(2),
    primary_email: z.string().email().optional().nullable(),
    client_type: z.string().optional().nullable(),
    client_status: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    office_phone: z.string().optional().nullable(),
    website: z.string().optional().nullable(),
  });

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: initialData.id,
      client_name: initialData.client_name,
      primary_email: initialData.primary_email,
      client_type: initialData.client_type || undefined,
      client_status: initialData.client_status || undefined,
      description: initialData.description || "",
      office_phone: initialData.office_phone || "",
      website: initialData.website || "",
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      await axios.put("/api/crm/clients", data);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="client_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client name</FormLabel>
              <FormControl>
                <Input disabled={isLoading} placeholder="John Doe" {...field} />
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input disabled={isLoading} placeholder="john@domain.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="client_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clientTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="client_status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clientStatusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea disabled={isLoading} placeholder="Notes" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-2 py-2">
          <Button disabled={isLoading} type="submit">Update client</Button>
        </div>
      </form>
    </Form>
  );
}


