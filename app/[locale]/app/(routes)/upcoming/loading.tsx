import Container from "../components/ui/Container";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function FeedLoading() {
  return (
    <Container
      title="Upcoming"
      description="Loading your schedule..."
    >
      <div className="space-y-6">
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-6 w-8" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Section cards skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-6 ml-auto rounded-full" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[...Array(2)].map((_, j) => (
                    <div key={j} className="flex items-start gap-3 p-3 rounded-lg border">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-12" />
                        </div>
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-3 w-10 mt-1" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-6">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[...Array(2)].map((_, j) => (
                    <div key={j} className="flex items-start gap-3 p-3 rounded-lg border">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}
