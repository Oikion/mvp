import { SkeletonPageHeader, SkeletonCard } from "@/components/ui/skeletons"

export function PageLoader() {
  return (
    <div className="container mx-auto py-6 space-y-8 animate-in fade-in duration-500">
        <SkeletonPageHeader />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <SkeletonCard />
             <SkeletonCard />
             <SkeletonCard />
             <SkeletonCard />
             <SkeletonCard />
             <SkeletonCard />
        </div>
    </div>
  )
}


