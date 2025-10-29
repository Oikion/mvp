"use client";

import { z } from "zod";
import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/use-toast";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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
import { Textarea } from "@/components/ui/textarea";

type Props = {
  industries: any[];
  users: any[];
  onFinish: () => void;
};

export function NewAccountForm({ industries, users, onFinish }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const formSchema = z
    .object({
      first_name: z.string().min(1, "First name is required"),
      last_name: z.string().min(1, "Last name is required"),
      email: z.string().email().optional().or(z.literal("")).optional(),
      phone: z.string().optional().or(z.literal("")).optional(),
      notes: z.string().optional().or(z.literal("")).optional(),
      assigned_to: z.string().min(3).max(50),
    })
    .refine(
      (data) => !!(data.email && data.email.length) || !!(data.phone && data.phone.length),
      {
        path: ["email"],
        message: "Email or phone number is required",
      }
    );

  type NewAccountFormValues = z.infer<typeof formSchema>;

  const form = useForm<NewAccountFormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: NewAccountFormValues) => {
    setIsLoading(true);
    try {
      await axios.post("/api/crm/clients", {
        client_name: `${data.first_name} ${data.last_name}`.trim(),
        primary_email: data.email || undefined,
        office_phone: data.phone || undefined,
        description: data.notes || undefined,
        assigned_to: data.assigned_to,
      });
      toast({
        title: "Success",
        description: "Client created successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      form.reset({ first_name: "", last_name: "", email: "", phone: "", notes: "", assigned_to: "" });
      router.refresh();
      onFinish();
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full px-10">
        <div className=" w-[800px] text-sm">
          <div className="pb-5 space-y-2">
            <div className="flex gap-5">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem className="w-1/2">
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem className="w-1/2">
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="w-1/2">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder="john@domain.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="w-1/2">
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder="+1 555 123 4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea disabled={isLoading} placeholder="Notes about the client" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned to</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user to assign the client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="overflow-y-auto h-56">
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <div className="grid gap-2 py-5">
          <Button disabled={isLoading} type="submit">Create client</Button>
        </div>
      </form>
    </Form>
  );
}
