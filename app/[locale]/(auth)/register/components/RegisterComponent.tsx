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
        afterSignUpUrl={`/${locale}`}
        additionalFields={[
          {
            name: "language",
            label: "Language",
            type: "select",
            required: true,
            options: [
              { value: "en", label: "English" },
              { value: "cz", label: "Czech" },
              { value: "de", label: "German" },
              { value: "uk", label: "Ukrainian" },
            ],
          },
        ]}
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
