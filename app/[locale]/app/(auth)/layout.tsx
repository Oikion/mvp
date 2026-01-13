import { notFound } from "next/navigation";
import { createTranslator } from "next-intl";
import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";

import "@/app/[locale]/globals.css";
import Footer from "@/app/[locale]/app/(routes)/components/Footer";
import { AlreadySignedInBanner } from "./components/AlreadySignedInBanner";

type Props = {
  params: Promise<{ locale: string }>;
};

const metadataBaseUrl = new URL(
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
);

async function getLocales(locale: string) {
  try {
    return (await import(`@/locales/${locale}.json`)).default;
  } catch (error) {
    notFound();
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;

  const {
    locale
  } = params;

  const messages = await getLocales(locale);
  const t = createTranslator({ locale, messages });
  return {
    metadataBase: metadataBaseUrl,
    title: t("RootLayout.title"),
    description: t("RootLayout.description"),
  };
}

const AuthLayout = async ({ children }: { children: React.ReactNode }) => {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <div className="relative flex flex-col h-dvh w-full overflow-hidden">
      {isSignedIn && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <AlreadySignedInBanner />
        </div>
      )}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {children}
      </div>
      <Footer />
    </div>
  );
};

export default AuthLayout;
