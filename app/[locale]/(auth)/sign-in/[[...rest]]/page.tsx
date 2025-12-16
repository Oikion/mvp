import { getDictionary } from "@/dictionaries";
import { SignInForm } from "../components/SignInForm";

interface SignInPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SignInPage({ params }: SignInPageProps) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return (
    <div className="flex justify-center items-center min-h-screen px-4 py-8">
      <SignInForm dict={dict.signIn} />
    </div>
  );
}
