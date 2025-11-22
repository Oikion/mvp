import { Spinner } from "@/components/ui/spinner";

const LoadingComponent = () => {
  return (
    <div className="flex w-full h-full flex-col items-center justify-center gap-4 min-h-[200px]">
      <Spinner size="xl" />
      <p className="text-muted-foreground text-sm animate-pulse font-medium">Loading...</p>
    </div>
  );
};

export default LoadingComponent;
