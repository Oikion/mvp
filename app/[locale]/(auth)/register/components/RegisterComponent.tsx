"use client";

import { SignUp } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useClerkTheme } from "@/lib/clerk-theme";

export function RegisterComponent() {
  const params = useParams();
  const locale = params.locale as string || "en";
  const { appearance } = useClerkTheme();

  return (
    <div className="flex justify-center items-center py-5">
      <SignUp
        routing="path"
        path={`/${locale}/register`}
        signInUrl={`/${locale}/sign-in`}
        afterSignUpUrl={`/${locale}/onboard`}
        forceRedirectUrl={`/${locale}/onboard`}
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
