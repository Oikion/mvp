"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import { motion } from "motion/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppToast } from "@/hooks/use-app-toast";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { signInSchema, getClerkErrorMessage, type SignInFormData } from "@/lib/validations/auth";
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignInFormProps {
  dict: {
    title: string;
    description: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    forgotPasswordLink: string;
    submitButton: string;
    submitting: string;
    signUpLink: string;
    signUpText: string;
    orContinueWith: string;
    googleButton: string;
    errors: {
      emailRequired: string;
      emailInvalid: string;
      passwordRequired: string;
      invalidCredentials: string;
      generic: string;
    };
  };
}

/**
 * Sign-in form component
 * 
 * Supports two authentication methods:
 * 1. Email/Password - Traditional sign-in with Clerk
 * 2. Google SSO - OAuth authentication via GoogleAuthButton
 * 
 * On successful sign-in:
 * - Redirects to dashboard (/{locale}/app)
 * - If user hasn't completed onboarding, the layout will redirect them
 */
export function SignInForm({ dict }: SignInFormProps) {
  const { signIn, isLoaded, setActive } = useSignIn();
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "el";
  const { toast } = useAppToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignInFormData) => {
    if (!isLoaded || !signIn) return;

    setIsSubmitting(true);

    try {
      // Attempt to sign in with email/password
      const result = await signIn.create({
        identifier: data.email,
        password: data.password,
      });

      if (result.status === "complete") {
        // Sign-in successful - activate the session
        await setActive({ session: result.createdSessionId });
        // Redirect to dashboard - layout will handle onboarding redirect if needed
        router.push(`/${locale}/app`);
      } else if (result.status === "needs_first_factor") {
        // Password was not verified yet, attempt first factor
        const firstFactorResult = await signIn.attemptFirstFactor({
          strategy: "password",
          password: data.password,
        });

        if (firstFactorResult.status === "complete") {
          await setActive({ session: firstFactorResult.createdSessionId });
          router.push(`/${locale}/app`);
        } else {
          toast.error("Sign in incomplete", { description: "Please complete all verification steps.", isTranslationKey: false });
        }
      } else {
        toast.error("Sign in failed", { description: dict.errors.generic, isTranslationKey: false });
      }
    } catch (err) {
      const error = err as { errors?: Array<{ code?: string; message?: string }> };
      const firstError = error?.errors?.[0];

      if (firstError?.code) {
        const message = getClerkErrorMessage(firstError.code, firstError.message);

        // Set field-specific errors when possible
        if (firstError.code.includes("identifier") || firstError.code === "form_identifier_not_found") {
          setError("email", { message });
        } else if (firstError.code.includes("password") || firstError.code === "form_password_incorrect") {
          setError("password", { message });
        } else {
          toast.error("Sign in failed", { description: message, isTranslationKey: false });
        }
      } else {
        toast.error("Sign in failed", { description: dict.errors.generic, isTranslationKey: false });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <LogIn className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{dict.title}</CardTitle>
          <CardDescription>{dict.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* CAPTCHA widget container for Clerk bot protection */}
          <div id="clerk-captcha" className="flex justify-center" />

          {/* Google SSO Button */}
          <GoogleAuthButton
            mode="sign-in"
            buttonText={dict.googleButton}
          />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {dict.orContinueWith}
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">{dict.emailLabel}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder={dict.emailPlaceholder}
                  className={cn(
                    "pl-10",
                    errors.email && "border-destructive focus-visible:ring-destructive"
                  )}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{dict.passwordLabel}</Label>
                <Link
                  href={`/${locale}/app/forgot-password`}
                  className="text-sm text-primary hover:underline"
                >
                  {dict.forgotPasswordLink}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={dict.passwordPlaceholder}
                  className={cn(
                    "pl-10 pr-10",
                    errors.password && "border-destructive focus-visible:ring-destructive"
                  )}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {dict.submitting}
                </>
              ) : (
                dict.submitButton
              )}
            </Button>
          </form>

          {/* Sign Up Link */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">{dict.signUpText} </span>
            <Link
              href={`/${locale}/app/register`}
              className="text-primary hover:underline font-medium"
            >
              {dict.signUpLink}
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default SignInForm;
