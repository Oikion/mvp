import { NavigationMenu, LegalFooter } from '@/components/website'

/**
 * Legal Pages Layout
 * 
 * Shared layout for all legal pages (Privacy Policy, Terms of Service, etc.)
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <NavigationMenu variant="legal" />
      <main className="pt-24 pb-12">
        {children}
      </main>
      <LegalFooter />
    </div>
  )
}



