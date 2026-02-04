"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import axios from "axios";

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
import { useAppToast } from "@/hooks/use-app-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, Copy, Check } from "lucide-react";

const FormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  confirmText: z
    .string()
    .min(1, "Confirmation text is required")
    .refine(
      (val) => val.toLowerCase() === "delete my account",
      "You must type 'delete my account' to confirm"
    ),
});

interface DeleteAccountFormProps {
  userId: string;
  username: string | null;
}

export function DeleteAccountForm({ userId, username }: DeleteAccountFormProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [orgCheckResult, setOrgCheckResult] = useState<{
    hasOnlyAdminOrgs: boolean;
    orgsToDelete: Array<{ id: string; name: string }>;
  } | null>(null);
  const [step, setStep] = useState<"validation" | "org-warning" | "deleting">("validation");
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [copiedConfirmText, setCopiedConfirmText] = useState(false);

  const copyToClipboard = async (text: string, type: "username" | "confirmText") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "username") {
        setCopiedUsername(true);
        setTimeout(() => setCopiedUsername(false), 2000);
      } else {
        setCopiedConfirmText(true);
        setTimeout(() => setCopiedConfirmText(false), 2000);
      }
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
      if (type === "username") {
        setCopiedUsername(true);
        setTimeout(() => setCopiedUsername(false), 2000);
      } else {
        setCopiedConfirmText(true);
        setTimeout(() => setCopiedConfirmText(false), 2000);
      }
    }
  };

  const router = useRouter();
  const { signOut } = useClerk();
  const { toast } = useAppToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      username: "",
      confirmText: "",
    },
    mode: "onChange", // Enable real-time validation
  });

  // Watch form values to check if button should be enabled
  const watchedUsername = form.watch("username");
  const watchedConfirmText = form.watch("confirmText");
  
  // Check if both fields are valid
  const isFormValid = form.formState.isValid && 
    watchedUsername === username && 
    watchedConfirmText.toLowerCase() === "delete my account" &&
    username !== null;

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      setIsLoading(true);

      // Check if username exists
      if (!username) {
        toast.error("Error", { description: "Username is not set. Please set a username in your profile first.", isTranslationKey: false });
        setIsLoading(false);
        return;
      }

      // Validate username matches
      if (data.username !== username) {
        form.setError("username", {
          message: "Username does not match",
        });
        setIsLoading(false);
        return;
      }

      // Check organizations before deletion
      const orgCheckResponse = await axios.post(`/api/user/${userId}/check-orgs-before-delete`);
      
      if (orgCheckResponse.data.hasOnlyAdminOrgs && orgCheckResponse.data.orgsToDelete.length > 0) {
        setOrgCheckResult({
          hasOnlyAdminOrgs: true,
          orgsToDelete: orgCheckResponse.data.orgsToDelete,
        });
        setStep("org-warning");
        setIsLoading(false);
        return;
      }

      // Proceed with deletion
      await proceedWithDeletion();
    } catch (error: any) {
      toast.error("Error", { description: error?.response?.data?.message || "Something went wrong while deleting your account.", isTranslationKey: false });
      setIsLoading(false);
    }
  }

  async function proceedWithDeletion() {
    try {
      setStep("deleting");
      setIsLoading(true);

      await axios.delete(`/api/user/${userId}/delete-account`);

      toast.success("Account deleted", { description: "Your account has been successfully deleted.", isTranslationKey: false });

      // Sign out and redirect
      await signOut({ redirectUrl: "/" });
    } catch (error: any) {
      toast.error("Error", { description: error?.response?.data?.message || "Something went wrong while deleting your account.", isTranslationKey: false });
      setIsLoading(false);
      setStep("validation");
    }
  }

  function handleCancel() {
    setIsDialogOpen(false);
    setStep("validation");
    setOrgCheckResult(null);
    form.reset();
  }

  function handleOpenChange(open: boolean) {
    setIsDialogOpen(open);
    // Reset form state when dialog is closed
    if (!open) {
      setStep("validation");
      setOrgCheckResult(null);
      form.reset();
    }
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive" type="button">
          Delete Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {step === "validation" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Account
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete your account and remove all associated data.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-4 py-4">
                  <div className="rounded-md bg-destructive/10 p-4">
                    <p className="text-sm text-destructive font-medium">
                      Warning: Your personal organization will be deleted along with all stored clients, properties, tasks, and other data.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Enter your username</FormLabel>
                        {username && (
                          <div className="relative">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-t-md text-sm -mb-px relative z-10">
                              <code className="font-mono text-primary font-medium">{username}</code>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 hover:bg-primary/20"
                                onClick={() => copyToClipboard(username, "username")}
                              >
                                {copiedUsername ? (
                                  <Check className="h-3 w-3 text-success" />
                                ) : (
                                  <Copy className="h-3 w-3 text-primary" />
                                )}
                              </Button>
                            </div>
                            <FormControl>
                              <Input
                                disabled={isLoading}
                                placeholder="Enter your username"
                                className="rounded-tl-none"
                                {...field}
                              />
                            </FormControl>
                          </div>
                        )}
                        {!username && (
                          <FormControl>
                            <Input
                              disabled={isLoading}
                              placeholder="Enter your username"
                              {...field}
                            />
                          </FormControl>
                        )}
                        <FormDescription>
                          Please enter your username to confirm account deletion.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type &quot;delete my account&quot;</FormLabel>
                        <div className="relative">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-t-md text-sm -mb-px relative z-10">
                            <code className="font-mono text-primary font-medium">delete my account</code>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 hover:bg-primary/20"
                              onClick={() => copyToClipboard("delete my account", "confirmText")}
                            >
                              {copiedConfirmText ? (
                                <Check className="h-3 w-3 text-success" />
                              ) : (
                                <Copy className="h-3 w-3 text-primary" />
                              )}
                            </Button>
                          </div>
                          <FormControl>
                            <Input
                              disabled={isLoading}
                              placeholder="delete my account"
                              className="rounded-tl-none"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <FormDescription>
                          Type &quot;delete my account&quot; to confirm.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="destructive" 
                    disabled={isLoading || !isFormValid}
                  >
                    {isLoading ? "Checking..." : "Delete Account"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}

        {step === "org-warning" && orgCheckResult && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Additional Organizations Will Be Deleted
              </DialogTitle>
              <DialogDescription>
                You are the only admin of the following organization(s). Deleting your account will also delete these organizations and remove all members.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-md bg-destructive/10 p-4">
                <p className="text-sm text-destructive font-medium mb-2">
                  The following organizations will be deleted:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {orgCheckResult.orgsToDelete.map((org) => (
                    <li key={org.id} className="text-sm">
                      {org.name}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-destructive font-medium mt-4">
                  This will also remove all properties, clients, tasks, and other data associated with these organizations, and kick all members.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel Deletion
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={proceedWithDeletion}
                disabled={isLoading}
              >
                {isLoading ? "Deleting..." : "Delete Anyway"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "deleting" && (
          <DialogHeader>
            <DialogTitle>Deleting Account...</DialogTitle>
            <DialogDescription>
              Please wait while we delete your account and associated data.
            </DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  );
}

