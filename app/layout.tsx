/**
 * Root layout for app directory
 * This is a minimal layout for redirect-only pages (app/page.tsx, app/dashboard/page.tsx)
 * The main application layouts are in app/[locale]/layout.tsx
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
