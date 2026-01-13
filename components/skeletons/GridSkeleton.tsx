import { Skeleton } from "@/components/ui/skeleton"

export function GridSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
         <div className="space-y-1">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
         </div>
         <div className="flex gap-2">
             <Skeleton className="h-10 w-32" />
             <Skeleton className="h-10 w-10" />
         </div>
      </div>

      <div className="flex items-center gap-4">
         <Skeleton className="h-10 w-64" />
         <Skeleton className="h-10 w-24" />
      </div>

      {/* Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col space-y-3 rounded-xl border p-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                </div>
                <Skeleton className="h-32 w-full rounded-md" />
                <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-4" />
                </div>
            </div>
        ))}
      </div>
    </div>
  )
}



















