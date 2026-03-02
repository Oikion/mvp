import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessCookie, isAccessGateEnabled } from "@/lib/app-access";
import { AccessCodeForm } from "./AccessCodeForm";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string }>;
};

const AccessPage = async ({ params, searchParams }: Props) => {
  const { locale } = await params;
  const { redirect: redirectTo } = await searchParams;

  // If the gate is disabled, skip this page entirely
  if (!isAccessGateEnabled()) {
    redirect(redirectTo || `/${locale}/app/sign-in`);
  }

  // If the user already has a valid access cookie, let them through
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get("oik_access")?.value;
  if (verifyAccessCookie(cookieValue)) {
    redirect(redirectTo || `/${locale}/app/sign-in`);
  }

  const destination = redirectTo || `/${locale}/app/sign-in`;

  return (
    <AccessCodeForm locale={locale} redirectTo={destination} />
  );
};

export default AccessPage;
