import Container from "../../components/ui/Container";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContactsLoading() {
  return (
    <Container
      title="Contacts"
      description="Loading contact data..."
    >
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between py-4">
          <div className="flex flex-1 items-center space-x-2">
            <Skeleton className="h-8 w-[150px] lg:w-[250px]" />
            <Skeleton className="h-8 w-20 border-dashed" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <div className="h-12 border-b px-4 flex items-center gap-4 bg-muted/50">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-4 w-[180px]" />
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="ml-auto h-4 w-8" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 border-b px-4 flex items-center gap-4 last:border-0">
              <Skeleton className="h-4 w-4 rounded" />
              <div className="flex items-center gap-3 w-[150px]">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-[180px]" />
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="ml-auto h-8 w-8" />
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-2">
          <Skeleton className="h-4 w-[200px]" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    </Container>
  );
}

















