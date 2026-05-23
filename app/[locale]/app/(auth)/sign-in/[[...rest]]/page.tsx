import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

interface SignInPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect_url?: string }>;
}

export default async function SignInPage({ params, searchParams }: SignInPageProps) {
  const { locale } = await params;

  // Redirect authenticated users straight to the app so they never see
  // Clerk's "you are already signed in" banner, which leads to the loop.
  const { userId } = await auth();
  if (userId) {
    const { redirect_url } = await searchParams;
    // Guard against open redirect: only accept same-origin relative paths.
    const isSafe = redirect_url && redirect_url.startsWith("/") && !redirect_url.startsWith("//");
    redirect(isSafe ? redirect_url : `/${locale}/app`);
  }

  return (
    <div className="flex justify-center items-center min-h-screen px-4">
      <SignIn
        routing="path"
        path={`/${locale}/app/sign-in`}
        fallbackRedirectUrl={`/${locale}/app`}
        signUpUrl={`/${locale}/app/register`}
      />
    </div>
  );
}
