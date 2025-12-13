import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

export function SkeletonCard() {
  return (
    <Card className="flex flex-col space-y-5 p-4">
      <CardHeader className="space-y-2 p-0">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-4/5" />
      </CardHeader>
      <CardContent className="p-0 space-y-2">
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
        </div>
      </CardContent>
      <CardFooter className="p-0 pt-4">
        <Skeleton className="h-9 w-24 rounded-md" />
      </CardFooter>
    </Card>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-[250px]" />
        <div className="flex space-x-2">
            <Skeleton className="h-9 w-[100px]" />
            <Skeleton className="h-9 w-[100px]" />
        </div>
      </div>
      <div className="rounded-md border">
        <div className="h-12 border-b px-4 flex items-center space-x-4 bg-muted/40">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-full max-w-[200px]" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-16 px-4 flex items-center space-x-4 border-b last:border-0">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[150px]" />
            </div>
            <Skeleton className="h-8 w-[80px]" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonForm() {
    return (
        <div className="space-y-6 p-1">
            <div className="space-y-2">
                <Skeleton className="h-5 w-[120px]" />
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-5 w-[120px]" />
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-5 w-[100px]" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-5 w-[100px]" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>
            <div className="space-y-2">
                <Skeleton className="h-5 w-[100px]" />
                <Skeleton className="h-32 w-full" />
            </div>
             <div className="flex justify-end space-x-4 pt-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-32" />
            </div>
        </div>
    )
}

export function SkeletonPageHeader() {
    return (
        <div className="flex flex-col space-y-2 pb-6">
            <Skeleton className="h-10 w-[300px]" />
            <Skeleton className="h-5 w-[500px]" />
        </div>
    )
}












