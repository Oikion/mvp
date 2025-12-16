"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
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
import {
  Building2,
  Users,
  User,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  Mail,
  Phone,
  Percent,
  Check,
  X,
  Loader2,
  Handshake,
  ArrowRight,
  PlayCircle,
  CheckCircle2,
  Edit,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Deal {
  id: string;
  title: string | null;
  status: string;
  propertyAgentSplit: any;
  clientAgentSplit: any;
  totalCommission: any;
  commissionCurrency: string;
  notes: string | null;
  createdAt: Date;
  closedAt: Date | null;
  isPropertyAgent: boolean;
  isProposer: boolean;
  property: any;
  client: any;
  propertyAgent: any;
  clientAgent: any;
}

interface DealDetailProps {
  deal: Deal;
}

const statusColors: Record<string, string> = {
  PROPOSED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  NEGOTIATING: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  ACCEPTED: "bg-green-500/15 text-green-600 dark:text-green-400",
  IN_PROGRESS: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  COMPLETED: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  CANCELLED: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  PROPOSED: "Πρόταση",
  NEGOTIATING: "Διαπραγμάτευση",
  ACCEPTED: "Αποδεκτή",
  IN_PROGRESS: "Σε Εξέλιξη",
  COMPLETED: "Ολοκληρωμένη",
  CANCELLED: "Ακυρωμένη",
};

export function DealDetail({ deal }: DealDetailProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [newSplit, setNewSplit] = useState(Number(deal.propertyAgentSplit));
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [finalCommission, setFinalCommission] = useState(
    deal.totalCommission ? String(Number(deal.totalCommission)) : ""
  );

  const router = useRouter();
  const { toast } = useToast();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("el-GR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleAccept = async () => {
    try {
      setIsLoading(true);
      await axios.put(`/api/deals/${deal.id}`, { status: "ACCEPTED" });
      toast({
        variant: "success",
        title: "Deal Accepted!",
        description: "You have accepted this deal. Time to close it!",
      });
      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data || "Failed to accept deal",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setIsLoading(true);
      await axios.put(`/api/deals/${deal.id}`, { status: "CANCELLED" });
      toast({
        variant: "success",
        title: "Deal Cancelled",
        description: "The deal has been cancelled.",
      });
      setShowCancelDialog(false);
      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data || "Failed to cancel deal",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProposeSplit = async () => {
    try {
      setIsLoading(true);
      await axios.put(`/api/deals/${deal.id}`, {
        propertyAgentSplit: newSplit,
        clientAgentSplit: 100 - newSplit,
        status: "NEGOTIATING",
      });
      toast({
        variant: "success",
        title: "Counter-proposal Sent",
        description: "Your proposed split has been sent to the other agent.",
      });
      setIsNegotiating(false);
      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data || "Failed to propose new split",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartProgress = async () => {
    try {
      setIsLoading(true);
      await axios.put(`/api/deals/${deal.id}`, { status: "IN_PROGRESS" });
      toast({
        variant: "success",
        title: "Deal In Progress",
        description: "The deal is now marked as in progress.",
      });
      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data || "Failed to update deal",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      setIsLoading(true);
      await axios.put(`/api/deals/${deal.id}`, {
        status: "COMPLETED",
        totalCommission: finalCommission ? parseFloat(finalCommission) : undefined,
      });
      toast({
        variant: "success",
        title: "Deal Completed! 🎉",
        description: "Congratulations on closing this deal!",
      });
      setShowCompleteDialog(false);
      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data || "Failed to complete deal",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canAccept =
    !deal.isProposer &&
    (deal.status === "PROPOSED" || deal.status === "NEGOTIATING");
  const canNegotiate =
    deal.status === "PROPOSED" || deal.status === "NEGOTIATING";
  const canStartProgress = deal.status === "ACCEPTED";
  const canComplete =
    deal.status === "ACCEPTED" || deal.status === "IN_PROGRESS";
  const canCancel = !["COMPLETED", "CANCELLED"].includes(deal.status);

  const mySplit = deal.isPropertyAgent
    ? Number(deal.propertyAgentSplit)
    : Number(deal.clientAgentSplit);
  const partnerSplit = deal.isPropertyAgent
    ? Number(deal.clientAgentSplit)
    : Number(deal.propertyAgentSplit);

  return (
    <div className="space-y-6">
      {/* Status and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge className={`${statusColors[deal.status]} text-sm py-1 px-3`}>
            {statusLabels[deal.status]}
          </Badge>
          {!deal.isProposer && canAccept && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              Awaiting Your Response
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canAccept && (
            <Button onClick={handleAccept} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Accept Deal
            </Button>
          )}
          {canStartProgress && (
            <Button onClick={handleStartProgress} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <PlayCircle className="h-4 w-4 mr-2" />
              )}
              Start Progress
            </Button>
          )}
          {canComplete && (
            <Button onClick={() => setShowCompleteDialog(true)} disabled={isLoading}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete Deal
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(true)}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Commission Split Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-primary" />
                Commission Split (Διαμοιρασμός)
              </CardTitle>
              <CardDescription>
                Agreement on how the commission will be divided
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isNegotiating ? (
                <div className="space-y-4">
                  <div className="px-2">
                    <Slider
                      value={[newSplit]}
                      onValueChange={(v: number[]) => setNewSplit(v[0])}
                      max={100}
                      min={0}
                      step={5}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-blue-600">{newSplit}%</p>
                      <p className="text-xs text-muted-foreground">
                        Property Agent
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-green-600">
                        {100 - newSplit}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Client Agent
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsNegotiating(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleProposeSplit} disabled={isLoading}>
                      {isLoading && (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      )}
                      Propose This Split
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-6">
                    {/* Property Agent */}
                    <div className="flex-1 text-center">
                      <Avatar className="h-16 w-16 mx-auto mb-2">
                        <AvatarImage src={deal.propertyAgent.avatar || ""} />
                        <AvatarFallback className="bg-blue-500/15 text-blue-600 dark:text-blue-400 text-xl">
                          {deal.propertyAgent.name?.charAt(0) || (
                            <User className="h-6 w-6" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-semibold">{deal.propertyAgent.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Building2 className="h-3 w-3" />
                        Property Agent
                      </p>
                      <p className="text-3xl font-bold text-blue-600 mt-2">
                        {Number(deal.propertyAgentSplit)}%
                      </p>
                      {deal.totalCommission && (
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(
                            (Number(deal.totalCommission) *
                              Number(deal.propertyAgentSplit)) /
                              100
                          )}
                        </p>
                      )}
                    </div>

                    <ArrowRight className="h-8 w-8 text-muted-foreground" />

                    {/* Client Agent */}
                    <div className="flex-1 text-center">
                      <Avatar className="h-16 w-16 mx-auto mb-2">
                        <AvatarImage src={deal.clientAgent.avatar || ""} />
                        <AvatarFallback className="bg-green-500/15 text-green-600 dark:text-green-400 text-xl">
                          {deal.clientAgent.name?.charAt(0) || (
                            <User className="h-6 w-6" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-semibold">{deal.clientAgent.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Users className="h-3 w-3" />
                        Client Agent
                      </p>
                      <p className="text-3xl font-bold text-green-600 mt-2">
                        {Number(deal.clientAgentSplit)}%
                      </p>
                      {deal.totalCommission && (
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(
                            (Number(deal.totalCommission) *
                              Number(deal.clientAgentSplit)) /
                              100
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {deal.totalCommission && (
                    <div className="text-center pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Total Commission
                      </p>
                      <p className="text-2xl font-bold">
                        {formatPrice(Number(deal.totalCommission))}
                      </p>
                    </div>
                  )}

                  {canNegotiate && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setIsNegotiating(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Propose Different Split
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Property Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Property
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="w-32 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {deal.property.linkedDocuments?.[0]?.document_file_url ? (
                    <img
                      src={deal.property.linkedDocuments[0].document_file_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">
                    {deal.property.property_name}
                  </h4>
                  {(deal.property.address_city || deal.property.address_state) && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {[deal.property.address_city, deal.property.address_state]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {deal.property.bedrooms && (
                      <span className="flex items-center gap-1">
                        <BedDouble className="h-4 w-4" />
                        {deal.property.bedrooms}
                      </span>
                    )}
                    {deal.property.bathrooms && (
                      <span className="flex items-center gap-1">
                        <Bath className="h-4 w-4" />
                        {deal.property.bathrooms}
                      </span>
                    )}
                    {(deal.property.size_net_sqm || deal.property.square_feet) && (
                      <span className="flex items-center gap-1">
                        <Ruler className="h-4 w-4" />
                        {deal.property.size_net_sqm || deal.property.square_feet}{" "}
                        sqm
                      </span>
                    )}
                  </div>
                  {deal.property.price && (
                    <p className="text-xl font-bold text-blue-600 mt-2">
                      {formatPrice(deal.property.price)}
                    </p>
                  )}
                </div>
                <Link href={`/mls/properties/${deal.property.id}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {deal.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {deal.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side Info */}
        <div className="space-y-6">
          {/* Client Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold">{deal.client.client_name}</h4>
                {deal.client.intent && (
                  <Badge variant="secondary" className="mt-1">
                    {deal.client.intent}
                  </Badge>
                )}
              </div>
              {deal.client.primary_email && (
                <a
                  href={`mailto:${deal.client.primary_email}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                >
                  <Mail className="h-4 w-4" />
                  {deal.client.primary_email}
                </a>
              )}
              {deal.client.primary_phone && (
                <a
                  href={`tel:${deal.client.primary_phone}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                >
                  <Phone className="h-4 w-4" />
                  {deal.client.primary_phone}
                </a>
              )}
              <Link href={`/crm/accounts/${deal.client.id}`}>
                <Button variant="outline" className="w-full mt-2" size="sm">
                  View Client
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">
                  {formatDistanceToNow(new Date(deal.createdAt))} ago
                </p>
              </div>
              {deal.closedAt && (
                <div>
                  <p className="text-muted-foreground">Closed</p>
                  <p className="font-medium">
                    {formatDistanceToNow(new Date(deal.closedAt))} ago
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel This Deal?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this deal? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Deal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Cancel Deal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete This Deal?</AlertDialogTitle>
            <AlertDialogDescription>
              Congratulations! Enter the final commission amount to close this deal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Final Commission Amount</Label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
              <Input
                type="number"
                value={finalCommission}
                onChange={(e) => setFinalCommission(e.target.value)}
                placeholder={
                  deal.totalCommission
                    ? String(Number(deal.totalCommission))
                    : "Enter amount"
                }
                className="pl-8"
              />
            </div>
            {finalCommission && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Split breakdown:</p>
                <div className="flex justify-between mt-2">
                  <span>
                    {deal.propertyAgent.name} ({Number(deal.propertyAgentSplit)}%)
                  </span>
                  <span className="font-semibold">
                    {formatPrice(
                      (parseFloat(finalCommission) *
                        Number(deal.propertyAgentSplit)) /
                        100
                    )}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>
                    {deal.clientAgent.name} ({Number(deal.clientAgentSplit)}%)
                  </span>
                  <span className="font-semibold">
                    {formatPrice(
                      (parseFloat(finalCommission) *
                        Number(deal.clientAgentSplit)) /
                        100
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Handshake className="h-4 w-4 mr-2" />
              Complete Deal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

