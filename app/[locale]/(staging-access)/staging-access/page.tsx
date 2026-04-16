import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyStagingCookie, isStagingGateEnabled } from "@/lib/app-access";
import { StagingCodeForm } from "./StagingCodeForm";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string }>;
};

const StagingAccessPage = async ({ params, searchParams }: Props) => {
  const { locale } = await params;
  const { redirect: redirectTo } = await searchParams;

  // If the gate is disabled, skip this page entirely
  if (!isStagingGateEnabled()) {
    redirect(redirectTo || `/${locale}`);
  }

  // If the user already has a valid staging cookie, let them through
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get("oik_staging")?.value;
  if (verifyStagingCookie(cookieValue)) {
    redirect(redirectTo || `/${locale}`);
  }

  const destination = redirectTo || `/${locale}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <StagingCodeForm locale={locale} redirectTo={destination} />
    </div>
  );
};

export default StagingAccessPage;
