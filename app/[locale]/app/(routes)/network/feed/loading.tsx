import Container from "../../components/ui/Container";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function FeedLoading() {
  return (
    <Container title="Feed" description="Loading...">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main feed column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Composer skeleton */}
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                    <Skeleton className="h-9 w-20 rounded-md" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filter pills skeleton */}
          <div className="flex items-center gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>

          {/* Posts skeleton */}
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="rounded-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-40 w-full rounded-lg" />
                <div className="flex items-center gap-1 pt-3 border-t">
                  <Skeleton className="h-8 flex-1 rounded-md" />
                  <Skeleton className="h-8 flex-1 rounded-md" />
                  <Skeleton className="h-8 flex-1 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sidebar skeleton (hidden on mobile) */}
        <div className="hidden lg:block lg:col-span-4 space-y-6">
          {/* Suggested Agents skeleton */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-7 w-16 rounded-md" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Suggested Agencies skeleton */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-7 w-16 rounded-md" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}
