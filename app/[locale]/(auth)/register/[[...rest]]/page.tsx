import { getDictionary } from "@/dictionaries";
import { RegisterForm } from "../components/RegisterForm";

interface RegisterPageProps {
  params: Promise<{ locale: string }>;
}

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return (
    <div className="flex justify-center items-center min-h-screen px-4 py-8">
      <RegisterForm dict={dict.register} />
    </div>
  );
}
