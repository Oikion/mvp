"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { useAppToast } from "@/hooks/use-app-toast";
import { UserPlus, Check, Clock, Loader2, UserMinus, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConnectionButtonProps {
  targetUserId: string;
  initialStatus?: {
    status: string;
    connectionId?: string;
    isIncoming?: boolean;
  };
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "secondary";
  className?: string;
}

export function ConnectionButton({
  targetUserId,
  initialStatus = { status: "NONE" },
  size = "default",
  variant = "default",
  className,
}: ConnectionButtonProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const router = useRouter();
  const { toast } = useAppToast();

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post("/api/connections", { targetUserId });
      setStatus({ status: "PENDING", connectionId: response.data.id });
      toast.success("Request Sent", { description: "Your connection request has been sent.", isTranslationKey: false });
      router.refresh();
    } catch (error: any) {
      toast.error("Error", { description: error.response?.data || "Failed to send request", isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!status.connectionId) return;

    try {
      setIsLoading(true);
      await axios.delete(`/api/connections/${status.connectionId}`);
      setStatus({ status: "NONE" });
      toast.success("Connection Removed", { description: "You are no longer connected.", isTranslationKey: false });
      setShowRemoveDialog(false);
      router.refresh();
    } catch (error: any) {
      toast.error("Error", { description: error.response?.data || "Failed to remove connection", isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!status.connectionId) return;

    try {
      setIsLoading(true);
      await axios.put(`/api/connections/${status.connectionId}`, { accept: true });
      setStatus({ ...status, status: "ACCEPTED" });
      toast.success("Connected!", { description: "You are now connected.", isTranslationKey: false });
      router.refresh();
    } catch (error: any) {
      toast.error("Error", { description: error.response?.data || "Failed to accept request", isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Button size={size} variant={variant} className={className} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  switch (status.status) {
    case "ACCEPTED":
      return (
        <>
          <Button
            size={size}
            variant="secondary"
            className={className}
            onClick={() => setShowRemoveDialog(true)}
          >
            <Check className="h-4 w-4 mr-2" />
            Connected
          </Button>
          <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Connection?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove this connection? You will no
                  longer be able to share entities with this agent.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemove}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      );

    case "PENDING":
      if (status.isIncoming) {
        return (
          <div className="flex gap-2">
            <Button
              size={size}
              variant="outline"
              className={className}
              onClick={() => setShowRemoveDialog(true)}
            >
              <X className="h-4 w-4 mr-1" />
              Decline
            </Button>
            <Button size={size} variant={variant} className={className} onClick={handleAccept}>
              <Check className="h-4 w-4 mr-1" />
              Accept
            </Button>
            <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Decline Request?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to decline this connection request?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemove}>Decline</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      }
      return (
        <Button
          size={size}
          variant="secondary"
          className={className}
          onClick={() => setShowRemoveDialog(true)}
        >
          <Clock className="h-4 w-4 mr-2" />
          Pending
          <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Request?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to cancel this connection request?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Request</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemove}>Cancel Request</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Button>
      );

    case "REJECTED":
    case "NONE":
    default:
      return (
        <Button
          size={size}
          variant={variant}
          className={className}
          onClick={handleConnect}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Connect
        </Button>
      );
  }
}















