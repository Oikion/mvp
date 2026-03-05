import Container from "../../components/ui/Container";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function NetworkProfileLoading() {
  return (
    <Container
      title="Public Profile"
      description="Loading profile..."
    >
      <div className="space-y-6">
        {/* Profile Header skeleton */}
        <div className="rounded-xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-32" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </div>

        {/* Tab bar skeleton */}
        <div className="flex gap-1 border-b">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>

        {/* Content skeleton */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-28" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}
