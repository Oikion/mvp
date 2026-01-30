import Container from "../components/ui/Container";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ProfileLoading() {
  return (
    <Container
      title="Settings"
      description="Manage your account settings and preferences"
    >
      <div className="w-full">
        {/* Tabs skeleton */}
        <div className="inline-grid grid-cols-5 gap-1 mb-8 h-10 items-center justify-center rounded-lg bg-sidebar-accent p-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-center gap-2 px-3 py-1.5">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-16 hidden sm:block" />
            </div>
          ))}
        </div>

        {/* Profile form skeleton */}
        <div className="space-y-6">
          {/* Avatar section */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </CardContent>
          </Card>

          {/* Form fields */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-24 w-full" />
              </div>
              <div className="flex justify-end">
                <Skeleton className="h-10 w-32" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}
