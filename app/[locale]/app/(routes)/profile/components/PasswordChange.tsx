"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";

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
import { useAppToast } from "@/hooks/use-app-toast";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const FormSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(50, "Password must be less than 50 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    cpassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.cpassword, {
    message: "Passwords do not match",
    path: ["cpassword"],
  });

type StrengthLevel = "weak" | "fair" | "good" | "strong";

function getPasswordStrength(password: string): {
  score: number;
  level: StrengthLevel;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 10;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[a-z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

  if (score < 40) return { score, level: "weak", color: "bg-destructive" };
  if (score < 70) return { score, level: "fair", color: "bg-warning" };
  if (score < 90) return { score, level: "good", color: "bg-primary" };
  return { score: 100, level: "strong", color: "bg-success" };
}

export function PasswordChangeForm({ userId }: { userId: string }) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const { toast } = useAppToast();
  const t = useTranslations("profile.passwordChange");
  const tCommon = useTranslations("common");

  const STRENGTH_LABELS: Record<StrengthLevel, string> = {
    weak: t("strengthWeak"),
    fair: t("strengthFair"),
    good: t("strengthGood"),
    strong: t("strengthStrong"),
  };

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      password: "",
      cpassword: "",
    },
    mode: "onChange",
  });

  const password = form.watch("password");
  const passwordStrength = getPasswordStrength(password || "");

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      setIsLoading(true);
      await axios.put(`/api/user/${userId}/setnewpass`, data);
      toast.success(t("toast.success"), { description: t("toast.successDesc"), isTranslationKey: false });
      form.reset();
      router.refresh();
    } catch (error: unknown) {
      const errorResponse = error as { response?: { data?: string } };
      toast.error(tCommon("toast.error"), { description: errorResponse.response?.data ||
          t("toast.errorDesc"), isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("newPassword")}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      disabled={isLoading}
                      type={showPassword ? "text" : "password"}
                      placeholder={t("newPasswordPlaceholder")}
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
                {password && (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {t("strength")}
                      </span>
                      <span
                        className={`font-medium ${
                          passwordStrength.level === "weak"
                            ? "text-destructive"
                            : passwordStrength.level === "fair"
                            ? "text-warning"
                            : passwordStrength.level === "good"
                            ? "text-primary"
                            : "text-success"
                        }`}
                      >
                        {STRENGTH_LABELS[passwordStrength.level]}
                      </span>
                    </div>
                    <Progress
                      value={passwordStrength.score}
                      className="h-1.5"
                    />
                  </div>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cpassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("confirmPassword")}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      disabled={isLoading}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={t("confirmPasswordPlaceholder")}
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={showConfirmPassword ? t("hidePassword") : t("showPassword")}
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormDescription className="text-xs">
          {t("requirements")}
        </FormDescription>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isLoading || !form.formState.isValid}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("changing")}
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                {t("changePassword")}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
