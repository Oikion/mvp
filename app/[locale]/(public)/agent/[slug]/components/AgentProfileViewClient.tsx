"use client";

import dynamic from "next/dynamic";
import type { ContactFormField } from "@/lib/contact-form-types";

// Profile type matching AgentProfileViewProps
type ProfileType = {
  user?: {
    name?: string | null;
    avatar?: string | null;
    username?: string | null;
    properties?: Array<{
      id: string;
      property_name: string;
      address_city?: string | null;
      address_state?: string | null;
      bedrooms?: number | null;
      bathrooms?: number | null;
      square_feet?: number | null;
      size_net_sqm?: number | null;
      price?: number | null;
      transaction_type?: string | null;
      linkedDocuments?: Array<{ document_file_url?: string | null }>;
    } | null>;
    _count?: {
      properties?: number;
      followers?: number;
    };
  } | null;
  yearsExperience?: number | null;
  specializations?: string[];
  publicEmail?: string | null;
  publicPhone?: string | null;
  socialLinks?: unknown;
  serviceAreas?: string[];
  languages?: string[];
  certifications?: string[];
  bio?: string | null;
  contactFormEnabled?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contactFormFields?: ContactFormField[] | any;
};

// Dynamically import AgentProfileView with SSR disabled to prevent window access during build
// The loading component will show while the client-side component loads
const AgentProfileView = dynamic(
  () => import("./AgentProfileView").then((mod) => ({ default: mod.AgentProfileView })),
  { 
    ssr: false,
  }
);

interface AgentProfileViewClientProps {
  profile: ProfileType;
  locale?: string;
}

export function AgentProfileViewClient({ profile, locale = "en" }: AgentProfileViewClientProps) {
  // The dynamic import with ssr: false handles client-only rendering
  // No need for window check - it causes hydration mismatch
  return <AgentProfileView profile={profile} locale={locale} />;
}

