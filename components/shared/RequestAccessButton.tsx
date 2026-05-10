"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Lock } from "lucide-react";
import { requestEntityAccess } from "@/actions/sharing/request-entity-access";
import { useAppToast } from "@/hooks/use-app-toast";

type EntityType = "PROPERTY" | "CONTACT" | "DOCUMENT" | "REQUEST";
type State = "idle" | "loading" | "sent";

interface RequestAccessButtonProps {
  entityType: EntityType;
  entityId: string;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
}

export function RequestAccessButton({
  entityType,
  entityId,
  className,
  size = "sm",
}: RequestAccessButtonProps) {
  const [state, setState] = useState<State>("idle");
  const { toast } = useAppToast();

  const handleRequest = async () => {
    if (state !== "idle") return;
    setState("loading");
    try {
      await requestEntityAccess({ entityType, entityId });
      setState("sent");
    } catch {
      setState("idle");
      toast.error("networkError");
    }
  };

  if (state === "sent") {
    return (
      <Button size={size} variant="outline" disabled className={className}>
        <Check className="h-3.5 w-3.5 mr-1.5" />
        Request sent
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant="outline"
      onClick={handleRequest}
      disabled={state === "loading"}
      className={className}
    >
      {state === "loading" ? (
        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
      ) : (
        <Lock className="h-3.5 w-3.5 mr-1.5" />
      )}
      Request access
    </Button>
  );
}
