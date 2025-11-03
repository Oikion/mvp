import axios from "axios";
import { notFound } from "next/navigation";
import { createTranslator } from "next-intl";

import "@/app/[locale]/globals.css";
import Footer from "@/app/[locale]/(routes)/components/Footer";

type Props = {
  params: Promise<{ locale: string }>;
};

async function getLocales(locale: string) {
  try {
    return (await import(`@/locales/${locale}.json`)).default;
  } catch (error) {
    notFound();
  }
}

export async function generateMetadata(props: Props) {
  const params = await props.params;

  const {
    locale
  } = params;

  const messages = await getLocales(locale);
  const t = createTranslator({ locale, messages });
  return {
    title: t("RootLayout.title"),
    description: t("RootLayout.description"),
  };
}

const AuthLayout = async ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen w-full">
      <div className="flex items-center grow h-full overflow-hidden">
        {children}
      </div>
      <Footer />
    </div>
  );
};

export default AuthLayout;
