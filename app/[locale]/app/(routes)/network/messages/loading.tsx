import { Skeleton } from "@/components/ui/skeleton";

export default function MessagesLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0">
      {/* Sidebar skeleton */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 p-2 space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b flex items-center px-4">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "" : "justify-end"}`}>
              <div className={`max-w-[70%] space-y-2 ${i % 2 === 0 ? "" : "items-end"}`}>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-16 w-64 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-20 border-t p-4">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
