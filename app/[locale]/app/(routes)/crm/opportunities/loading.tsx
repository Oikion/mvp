import Container from "../../components/ui/Container";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function OpportunitiesLoading() {
  return (
    <Container
      title="Opportunities"
      description="Loading opportunity data..."
    >
      <div className="space-y-6">
        {/* Pipeline Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Kanban/Table Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-8 w-20 border-dashed" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>

        {/* Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, colIdx) => (
            <div key={colIdx} className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-6 rounded-full" />
              </div>
              {[...Array(3)].map((_, cardIdx) => (
                <Card key={cardIdx}>
                  <CardContent className="p-3 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <div className="flex items-center justify-between pt-2">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}

















