"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
  data: {
    id: string;
    name: string | null;
    username: string | null;
    account_name: string | null;
  };
}

const FormSchema = z.object({
  id: z.string(),
  name: z.string().min(3).max(50),
  username: z.string().min(2).max(50).regex(/^\w+$/, {
    message: "Username can only contain letters, numbers, and underscores",
  }),
  account_name: z.string().min(2).max(50),
});

export function ProfileForm({ data }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [originalUsername] = useState<string>(data?.username ?? "");

  const router = useRouter();

  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: data
      ? {
          id: data.id || "",
          name: data.name ?? "",
          username: data.username ?? "",
          account_name: data.account_name ?? "",
        }
      : {
          id: "",
          name: "",
          username: "",
          account_name: "",
        },
  });

  async function onSubmit(formData: z.infer<typeof FormSchema>) {
    try {
      setIsLoading(true);
      
      const usernameChanged = formData.username !== originalUsername;
      
      // If username changed, update it in Clerk first
      if (usernameChanged) {
        try {
          await axios.put(`/api/user/${formData.id}/update-username`, {
            username: formData.username,
          });
        } catch (usernameError) {
          // Check for specific Clerk errors
          const errorResponse = usernameError as { response?: { data?: { error?: string } } };
          const errorMessage = errorResponse?.response?.data?.error || "Failed to update username";
          
          toast({
            variant: "destructive",
            title: "Username Update Failed",
            description: errorMessage,
          });
          setIsLoading(false);
          return;
        }
      }
      
      // Update other profile fields (name, account_name)
      // Username is not sent here as it's managed by Clerk
      await axios.put(`/api/user/${formData.id}/updateprofile`, {
        name: formData.name,
        account_name: formData.account_name,
      });
      
      toast({
        variant: "success",
        title: "Profile updated",
        description: usernameChanged 
          ? "Your profile and username have been updated successfully."
          : "Your profile has been updated successfully.",
      });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong while updating your profile.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex space-x-5 w-full p-5 items-end"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="w-1/3">
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input disabled={isLoading} placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem className="w-1/3">
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input disabled={isLoading} placeholder="jdoe" {...field} />
              </FormControl>
              <FormDescription className="text-xs">
                Changing your username will update your public profile URL
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="account_name"
          render={({ field }) => (
            <FormItem className="w-1/3">
              <FormLabel>Company</FormLabel>
              <FormControl>
                <Input
                  disabled={isLoading}
                  placeholder="Tesla Inc.,"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button className="w-[150px]" type="submit" disabled={isLoading}>
          {isLoading ? "Updating..." : "Update"}
        </Button>
      </form>
    </Form>
  );
}
