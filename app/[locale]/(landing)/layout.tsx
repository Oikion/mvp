import "@/app/[locale]/globals.css";

/**
 * Landing Page Layout
 * 
 * This layout wraps the public landing page with minimal styling.
 * It inherits the NextIntlClientProvider from the root [locale] layout,
 * so translations are available via useTranslations hook.
 */
const LandingLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen w-full bg-background">
      {children}
    </div>
  );
};

export default LandingLayout;


