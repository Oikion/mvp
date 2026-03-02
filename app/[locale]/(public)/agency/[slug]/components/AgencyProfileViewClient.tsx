"use client";

import dynamic from "next/dynamic";

type AgencyProfile = NonNullable<
  Awaited<ReturnType<typeof import("@/actions/organization/agency-profile").getPublicAgencyProfile>>
>;

// Dynamically import AgencyProfileView with SSR disabled to prevent window access during build
const AgencyProfileView = dynamic(
  () => import("./AgencyProfileView").then((mod) => ({ default: mod.AgencyProfileView })),
  {
    ssr: false,
  }
);

interface AgencyProfileViewClientProps {
  profile: AgencyProfile;
  locale?: string;
}

export function AgencyProfileViewClient({
  profile,
  locale = "en",
}: AgencyProfileViewClientProps) {
  return <AgencyProfileView profile={profile} locale={locale} />;
}
