import React, { Suspense } from "react";
import Container from "../../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getListings } from "@/actions/mls/get-listings";
import ListingsPageView from "./components/ListingsPageView";
import { getCachedDictionary } from "@/lib/cached";

// force-dynamic is required because:
// 1. Listings data can change frequently as properties are published/unpublished
// 2. Users expect to see current data when managing listings
export const dynamic = "force-dynamic";

export default async function ListingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [listings, dict] = await Promise.all([
    getListings(),
    getCachedDictionary(locale),
  ]);
  
  return (
    <Container 
      title={dict.mls?.Listings?.title || "Published Listings"} 
      description={dict.mls?.Listings?.description || "Properties published to external portals"}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <ListingsPageView listings={listings} />
      </Suspense>
    </Container>
  );
}
