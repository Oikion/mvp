import { getCurrentUserSafe } from "@/lib/get-current-user";
import { OnboardingSteps } from "./components/OnboardingSteps";
import { getDictionary } from "@/dictionaries";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUserSafe();
  const dict = await getDictionary(locale);

  // Layout handles auth and onboarding redirect checks
  // Render full-screen onboarding experience
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 md:px-8 py-4 md:py-8 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-2xl">
        <div className="bg-card/80 backdrop-blur-sm p-4 sm:p-6 md:p-8 lg:p-10 rounded-2xl border shadow-xl">
          <OnboardingSteps user={user} dict={dict.onboarding} locale={locale} />
        </div>
      </div>
    </div>
  );
}
