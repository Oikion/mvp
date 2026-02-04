import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LightbulbIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingBoxProps {
  className?: string;
}

const LoadingBox = ({ className }: LoadingBoxProps) => {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium bg-muted text-foreground animate-pulse ">
          Notions
        </CardTitle>
        <LightbulbIcon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-medium text-foreground bg-muted animate-pulse ">
          Loading...
        </div>
      </CardContent>
    </Card>
  );
};

export default LoadingBox;
