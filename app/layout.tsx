/**
 * Root layout for app directory
 * This is a minimal layout for redirect-only pages (app/page.tsx, app/dashboard/page.tsx)
 * The main application layouts are in app/[locale]/layout.tsx
 * 
 * IMPORTANT: Must match the structure of [locale]/layout.tsx to prevent hydration mismatches
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
