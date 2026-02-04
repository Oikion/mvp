import { Skeleton } from "@/components/ui/skeleton";

export default function AiLoading() {
  return (
    <div className="flex h-full gap-4">
      {/* Sidebar skeleton */}
      <div className="w-64 shrink-0 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      
      {/* Chat area skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 space-y-4 p-4">
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-16 w-2/3 ml-auto" />
          <Skeleton className="h-16 w-3/4" />
        </div>
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}
