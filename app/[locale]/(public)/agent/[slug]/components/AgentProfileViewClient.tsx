"use client";

import type { ContactFormField } from "@/lib/contact-form-types";
import { AgentProfileView } from "./AgentProfileView";

type ProfileType = {
  user?: {
    id?: string;
    name?: string | null;
    avatar?: string | null;
    username?: string | null;
    properties?: Array<{
      id: string;
      friendlyId: string;
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

interface AgentProfileViewClientProps {
  profile: ProfileType;
  locale?: string;
}

export function AgentProfileViewClient({ profile, locale = "en" }: AgentProfileViewClientProps) {
  return <AgentProfileView profile={profile} locale={locale} />;
}
