"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useOrganizationList } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(50, "Organization name must be less than 50 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50, "Slug must be less than 50 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
    .optional()
    .or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateOrganizationForm() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string || "en";
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { createOrganization } = useOrganizationList();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      if (!createOrganization) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Unable to create organization. Please try again.",
        });
        return;
      }

      const slug = data.slug || generateSlug(data.name);
      
      const organization = await createOrganization({
        name: data.name,
        slug: slug,
      });

      if (!organization) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create organization. Please try again.",
        });
        return;
      }

      toast({
        variant: "success",
        title: "Success",
        description: "Organization created successfully!",
      });

      // Check if user needs to complete onboarding
      // Fetch user data to check onboarding status
      try {
        const userResponse = await fetch("/api/user");
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (!userData.onboardingCompleted) {
            // Redirect to onboarding if not completed
            router.push(`/${locale}/onboard`);
            router.refresh();
            return;
          }
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      }

      // Redirect to dashboard after successful creation
      router.push(`/${locale}`);
      router.refresh();
    } catch (error: any) {
      console.error("Error creating organization:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.errors?.[0]?.message || error?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Acme Inc."
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      // Auto-update slug if it's empty or matches the previous name
                      const currentSlug = form.getValues("slug");
                      const newSlug = generateSlug(e.target.value);
                      if (!currentSlug || currentSlug === generateSlug(field.value)) {
                        form.setValue("slug", newSlug);
                      }
                    }}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormDescription>
                  Choose a name for your organization.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Slug</FormLabel>
                <FormControl>
                  <Input
                    placeholder="acme-inc"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormDescription>
                  A URL-friendly identifier for your organization (optional, auto-generated from name).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Organization"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}

