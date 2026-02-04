import { AppSkeletonLayout } from "@/components/skeletons/AppSkeletonLayout"
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton"

export default function Loading() {
  return (
    <AppSkeletonLayout>
      <DashboardSkeleton />
    </AppSkeletonLayout>
  );
}
