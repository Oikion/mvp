import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
         <Skeleton className="h-8 w-48" />
         <Skeleton className="h-4 w-96" />
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card text-card-foreground shadow p-6 flex flex-col gap-2">
             <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
             </div>
             <div className="flex flex-col gap-1">
                 <Skeleton className="h-8 w-20" />
                 <Skeleton className="h-3 w-32" />
             </div>
          </div>
        ))}
      </div>

      {/* Main Chart + Recent Clients */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border bg-card p-6">
            <div className="flex flex-col gap-4">
                 <div className="flex flex-col gap-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                 </div>
                 <Skeleton className="h-[300px] w-full" />
            </div>
        </div>
        <div className="col-span-3 rounded-xl border bg-card p-6">
             <div className="flex flex-col gap-4">
                 <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                 </div>
                 <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-9 w-9 rounded-full" />
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                            <Skeleton className="ml-auto h-4 w-12" />
                        </div>
                    ))}
                 </div>
            </div>
        </div>
      </div>

      {/* Stats Charts + Recent Properties */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-[200px] w-full" />
            </div>
            <div className="rounded-xl border bg-card p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-[200px] w-full" />
            </div>
        </div>
         <div className="col-span-3 rounded-xl border bg-card p-6">
             <div className="flex flex-col gap-4">
                 <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                 </div>
                 <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-9 w-9 rounded-md" />
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                            <Skeleton className="ml-auto h-4 w-16" />
                        </div>
                    ))}
                 </div>
            </div>
        </div>
      </div>
    </div>
  )
}













