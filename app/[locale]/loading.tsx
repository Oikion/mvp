import { PageLoader } from "@/components/ui/page-loader";

export default function loading() {
  return (
    <div className="w-full h-full min-h-screen bg-background">
      <PageLoader />
    </div>
  );
}
