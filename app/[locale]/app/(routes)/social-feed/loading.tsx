import Container from "../components/ui/Container";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SocialFeedLoading() {
  return (
    <Container
      title="Social Feed"
      description="Loading..."
    >
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Create post skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-20 w-full rounded-lg" />
                <div className="flex justify-end">
                  <Skeleton className="h-9 w-20" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts skeleton */}
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-40 w-full rounded-lg" />
              <div className="flex items-center gap-4 pt-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Container>
  );
}

