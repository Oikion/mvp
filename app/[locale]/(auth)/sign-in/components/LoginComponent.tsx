"use client";

import { SignIn } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useClerkTheme } from "@/lib/clerk-theme";

export function LoginComponent() {
  const params = useParams();
  const locale = params.locale as string || "en";
  const { appearance } = useClerkTheme();

  return (
    <div className="flex justify-center items-center py-5">
      <SignIn
        routing="path"
        path={`/${locale}/sign-in`}
        signUpUrl={`/${locale}/register`}
        afterSignInUrl={`/${locale}`}
        forceRedirectUrl={`/${locale}`}
        appearance={{
          ...appearance,
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg",
          },
        }}
      />
    </div>
  );
}
