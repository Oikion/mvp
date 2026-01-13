"use client";

import dynamic from "next/dynamic";

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
};

// Dynamically import AgentProfileView with SSR disabled to prevent window access during build
const AgentProfileView = dynamic(
  () => import("./AgentProfileView").then((mod) => ({ default: mod.AgentProfileView })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading profile...</p>
        </div>
      </div>
    )
  }
);

interface AgentProfileViewClientProps {
  profile: ProfileType;
}

export function AgentProfileViewClient({ profile }: AgentProfileViewClientProps) {
  // Only render on client side to prevent window access during build
  if (typeof window === 'undefined') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return <AgentProfileView profile={profile} />;
}

