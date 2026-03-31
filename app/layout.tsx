import "./[locale]/globals.css";

import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";

import { SkipLink } from "@/components/ui/skip-link";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "arial"],
});

const manrope = Manrope({
  subsets: ["latin", "greek"],
  variable: "--font-manrope",
  display: "swap",
  fallback: ["system-ui", "arial"],
});

const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appBaseUrl),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${manrope.variable} font-sans min-h-screen`} suppressHydrationWarning>
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
