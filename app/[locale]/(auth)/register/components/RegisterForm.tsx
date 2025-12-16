"use client";

import { useState } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import { motion } from "motion/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { registerSchema, getClerkErrorMessage, type RegisterFormData } from "@/lib/validations/auth";
import { Mail, Lock, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface RegisterFormProps {
  dict: {
    title: string;
    description: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    submitButton: string;
    submitting: string;
    signInLink: string;
    signInText: string;
    orContinueWith: string;
    googleButton: string;
    verificationTitle: string;
    verificationDescription: string;
    verificationCodeLabel: string;
    verificationCodePlaceholder: string;
    verifyButton: string;
    resendCode: string;
    errors: {
      emailRequired: string;
      emailInvalid: string;
      passwordRequired: string;
      passwordTooShort: string;
      passwordsDontMatch: string;
      generic: string;
    };
  };
}

type FormStep = "register" | "verify";

export function RegisterForm({ dict }: RegisterFormProps) {
  const { signUp, isLoaded, setActive } = useSignUp();
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const { toast } = useToast();

  const [step, setStep] = useState<FormStep>("register");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    if (!isLoaded || !signUp) return;

    setIsSubmitting(true);

    try {
      // Create sign up with Clerk
      await signUp.create({
        emailAddress: data.email,
        password: data.password,
      });

      // Prepare email verification - this sends the verification code
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setPendingEmail(data.email);
      
      // Notify user that code was sent
      toast({
        title: "Verification code sent",
        description: `A verification code has been sent to ${data.email}`,
      });
      
      setStep("verify");
    } catch (err) {
      const error = err as { errors?: Array<{ code?: string; message?: string }> };
      const firstError = error?.errors?.[0];
      
      if (firstError?.code) {
        const message = getClerkErrorMessage(firstError.code, firstError.message);
        
        // Set field-specific errors when possible
        if (firstError.code.includes("identifier") || firstError.code.includes("email")) {
          setError("email", { message });
        } else if (firstError.code.includes("password")) {
          setError("password", { message });
        } else {
          toast({
            variant: "destructive",
            title: "Registration failed",
            description: message,
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: dict.errors.generic,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerification = async () => {
    if (!isLoaded || !signUp) return;

    setIsSubmitting(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        // Redirect to onboarding
        router.push(`/${locale}/onboard`);
      } else {
        toast({
          variant: "destructive",
          title: "Verification incomplete",
          description: "Please complete all verification steps.",
        });
      }
    } catch (err) {
      const error = err as { errors?: Array<{ code?: string; message?: string }> };
      const firstError = error?.errors?.[0];
      
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: getClerkErrorMessage(
          firstError?.code || "",
          firstError?.message || "Invalid verification code. Please try again."
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded || !signUp) return;

    try {
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
      toast({
        title: "Code sent",
        description: "A new verification code has been sent to your email.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to resend code",
        description: "Please try again later.",
      });
    }
  };

  // Verification step
  if (step === "verify") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {dict.verificationTitle}
            </CardTitle>
            <CardDescription>
              {dict.verificationDescription.replace("{email}", pendingEmail)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">{dict.verificationCodeLabel}</Label>
              <Input
                id="code"
                placeholder={dict.verificationCodePlaceholder}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="text-center text-lg tracking-widest"
                maxLength={6}
              />
            </div>
            <Button
              onClick={handleVerification}
              disabled={isSubmitting || verificationCode.length < 6}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                dict.verifyButton
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={handleResendCode}
              className="w-full"
              type="button"
            >
              {dict.resendCode}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Registration form
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{dict.title}</CardTitle>
          <CardDescription>{dict.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google SSO Button */}
          <GoogleAuthButton
            mode="sign-up"
            redirectUrl={`/${locale}/onboard`}
            buttonText={dict.googleButton}
          />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
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
              <Label htmlFor="password">{dict.passwordLabel}</Label>
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

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{dict.confirmPasswordLabel}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={dict.confirmPasswordPlaceholder}
                  className={cn(
                    "pl-10 pr-10",
                    errors.confirmPassword && "border-destructive focus-visible:ring-destructive"
                  )}
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Clerk CAPTCHA Widget - Required for bot protection */}
            <div id="clerk-captcha" data-cl-theme="dark" />

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

          {/* Sign In Link */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">{dict.signInText} </span>
            <Link
              href={`/${locale}/sign-in`}
              className="text-primary hover:underline font-medium"
            >
              {dict.signInLink}
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default RegisterForm;
