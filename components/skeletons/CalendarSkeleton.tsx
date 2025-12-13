import { Skeleton } from "@/components/ui/skeleton"

export function CalendarSkeleton() {
  return (
    <div className="flex h-full flex-col space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
             <Skeleton className="h-9 w-24" />
             <Skeleton className="h-9 w-9" />
             <Skeleton className="h-9 w-9" />
             <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex items-center gap-2">
             <Skeleton className="h-9 w-24" />
             <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex flex-1 flex-col rounded-md border">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b">
            {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-10 border-r last:border-r-0 flex items-center justify-center">
                    <Skeleton className="h-4 w-12" />
                </div>
            ))}
        </div>
        {/* Days Grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-5">
             {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="border-b border-r p-2 last:border-r-0 relative">
                     <Skeleton className="h-4 w-6 mb-2" />
                     {i % 5 === 0 && <Skeleton className="h-6 w-full rounded bg-primary/10" />}
                     {i % 8 === 0 && <Skeleton className="h-6 w-[80%] rounded bg-secondary/10 mt-1" />}
                </div>
             ))}
        </div>
      </div>
    </div>
  )
}











