"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Mail, Send, Loader2, CheckCircle } from "lucide-react";
import type { ContactFormField } from "@/actions/social/contact-form";

interface AgentContactFormProps {
  agentUsername: string;
  agentName: string;
  fields: ContactFormField[];
  locale: string;
}

export function AgentContactForm({
  agentUsername,
  agentName,
  fields,
  locale,
}: AgentContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build dynamic schema based on fields
  const buildSchema = () => {
    const shape: Record<string, z.ZodTypeAny> = {};
    
    fields.forEach((field) => {
      let fieldSchema: z.ZodTypeAny;
      
      switch (field.type) {
        case "email":
          fieldSchema = z.string().email(locale === "el" ? "Μη έγκυρη διεύθυνση email" : "Invalid email address");
          break;
        case "phone":
          fieldSchema = z.string();
          break;
        case "textarea":
          fieldSchema = z.string().max(2000);
          break;
        case "checkbox":
          fieldSchema = z.boolean();
          break;
        case "select":
          fieldSchema = z.string();
          break;
        default:
          fieldSchema = z.string();
      }
      
      if (field.required && field.type !== "checkbox") {
        fieldSchema = fieldSchema.refine((val) => val && val.toString().trim() !== "", {
          message: locale === "el" ? "Αυτό το πεδίο είναι υποχρεωτικό" : "This field is required",
        });
      } else if (!field.required && field.type !== "checkbox") {
        fieldSchema = fieldSchema.optional().or(z.literal(""));
      }
      
      shape[field.id] = fieldSchema;
    });
    
    // Add privacy consent
    shape.privacyConsent = z.boolean().refine((val) => val === true, {
      message: locale === "el" 
        ? "Πρέπει να αποδεχτείτε την πολιτική απορρήτου" 
        : "You must accept the privacy policy",
    });
    
    return z.object(shape);
  };

  const schema = buildSchema();
  type FormData = z.infer<typeof schema>;

  // Build default values
  const defaultValues: Record<string, any> = {};
  fields.forEach((field) => {
    if (field.type === "checkbox") {
      defaultValues[field.id] = false;
    } else {
      defaultValues[field.id] = "";
    }
  });
  defaultValues.privacyConsent = false;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/agent/${agentUsername}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to submit form");
      }
      
      setIsSuccess(true);
      form.reset();
    } catch (err: any) {
      setError(err.message || (locale === "el" ? "Αποτυχία αποστολής" : "Failed to submit"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="py-8 text-center">
          <div className="rounded-full w-16 h-16 bg-success/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h3 className="text-lg font-semibold text-success dark:text-success mb-2">
            {locale === "el" ? "Μήνυμα Εστάλη!" : "Message Sent!"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {locale === "el" 
              ? `Ο/Η ${agentName} θα επικοινωνήσει μαζί σας σύντομα.`
              : `${agentName} will get back to you soon.`}
          </p>
          <Button variant="outline" onClick={() => setIsSuccess(false)}>
            {locale === "el" ? "Αποστολή άλλου μηνύματος" : "Send another message"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm bg-white dark:bg-card/50 border-border dark:border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-foreground dark:text-foreground">
          <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-primary/20/30">
            <Mail className="h-4 w-4 text-primary dark:text-primary" />
          </div>
          {locale === "el" ? "Επικοινωνήστε μαζί μου" : "Contact Me"}
        </CardTitle>
        <CardDescription>
          {locale === "el" 
            ? "Συμπληρώστε τη φόρμα και θα επικοινωνήσω μαζί σας σύντομα."
            : "Fill out the form and I'll get back to you soon."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {fields.map((field) => (
              <FormField
                key={field.id}
                control={form.control}
                name={field.id as any}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </FormLabel>
                    <FormControl>
                      {field.type === "textarea" ? (
                        <Textarea
                          {...formField}
                          placeholder={field.placeholder}
                          rows={4}
                          disabled={isSubmitting}
                        />
                      ) : field.type === "checkbox" ? (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={formField.value as boolean}
                            onCheckedChange={formField.onChange}
                            disabled={isSubmitting}
                          />
                          <span className="text-sm text-muted-foreground">
                            {field.placeholder || field.label}
                          </span>
                        </div>
                      ) : field.type === "select" && field.options ? (
                        <Select
                          value={formField.value as string}
                          onValueChange={formField.onChange}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={field.placeholder || locale === "el" ? "Επιλέξτε..." : "Select..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          {...formField}
                          type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                          placeholder={field.placeholder}
                          disabled={isSubmitting}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            {/* Privacy Consent */}
            <FormField
              control={form.control}
              name="privacyConsent"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-start gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value as boolean}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                        className="mt-1"
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">
                      {locale === "el" ? (
                        <>
                          Αποδέχομαι την{" "}
                          <a href="/privacy" className="text-primary hover:underline" target="_blank">
                            πολιτική απορρήτου
                          </a>{" "}
                          και συμφωνώ με την επεξεργασία των δεδομένων μου.
                        </>
                      ) : (
                        <>
                          I accept the{" "}
                          <a href="/privacy" className="text-primary hover:underline" target="_blank">
                            privacy policy
                          </a>{" "}
                          and agree to the processing of my data.
                        </>
                      )}
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {locale === "el" ? "Αποστολή..." : "Sending..."}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {locale === "el" ? "Αποστολή Μηνύματος" : "Send Message"}
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
