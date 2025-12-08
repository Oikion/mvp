"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  Loader2,
  Building2,
  Users,
  Percent,
  User,
  Handshake,
} from "lucide-react";

interface Property {
  id: string;
  property_name: string;
  price: number | null;
  address_city: string | null;
}

interface Client {
  id: string;
  client_name: string;
  intent: string | null;
}

interface Connection {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
}

interface CreateDealButtonProps {
  translations: any;
}

export function CreateDealButton({ translations: t }: CreateDealButtonProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);

  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedConnection, setSelectedConnection] = useState<string>("");
  const [amIPropertyAgent, setAmIPropertyAgent] = useState<boolean>(true);
  const [split, setSplit] = useState<number>(50);
  const [totalCommission, setTotalCommission] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [propertiesRes, clientsRes, connectionsRes] = await Promise.all([
        axios.get("/api/mls/properties"),
        axios.get("/api/crm/clients"),
        axios.get("/api/connections?status=ACCEPTED"),
      ]);

      setProperties(propertiesRes.data);
      setClients(clientsRes.data);
      setConnections(connectionsRes.data.map((c: any) => c.user));
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedProperty || !selectedClient || !selectedConnection) {
      toast({
        variant: "destructive",
        title: t.createDialog.missingInfo,
        description: t.createDialog.missingInfoDescription,
      });
      return;
    }

    try {
      setIsLoading(true);

      const payload = {
        propertyId: selectedProperty,
        clientId: selectedClient,
        propertyAgentId: amIPropertyAgent ? "CURRENT_USER" : selectedConnection,
        clientAgentId: amIPropertyAgent ? selectedConnection : "CURRENT_USER",
        propertyAgentSplit: amIPropertyAgent ? split : 100 - split,
        clientAgentSplit: amIPropertyAgent ? 100 - split : split,
        totalCommission: totalCommission ? parseFloat(totalCommission) : undefined,
        notes: notes || undefined,
      };

      // Replace CURRENT_USER with actual user ID (handled by backend)
      await axios.post("/api/deals", {
        ...payload,
        propertyAgentId:
          payload.propertyAgentId === "CURRENT_USER"
            ? undefined
            : payload.propertyAgentId,
        clientAgentId:
          payload.clientAgentId === "CURRENT_USER"
            ? undefined
            : payload.clientAgentId,
      });

      toast({
        variant: "success",
        title: t.toast.dealProposed,
        description: t.toast.dealProposedDesc,
      });

      setOpen(false);
      resetForm();
      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t.toast.error,
        description: error.response?.data || t.toast.createError,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedProperty("");
    setSelectedClient("");
    setSelectedConnection("");
    setAmIPropertyAgent(true);
    setSplit(50);
    setTotalCommission("");
    setNotes("");
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("el-GR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t.createDialog.newDeal}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            {t.createDialog.title}
          </DialogTitle>
          <DialogDescription>
            {t.createDialog.description}
          </DialogDescription>
        </DialogHeader>

        {isLoadingData ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">{t.createDialog.loading}</p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Property Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {t.createDialog.property} *
              </Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger>
                  <SelectValue placeholder={t.createDialog.selectProperty} />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{property.property_name}</span>
                        {property.price && (
                          <span className="text-muted-foreground">
                            {formatPrice(property.price)}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Client Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t.createDialog.client} *
              </Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder={t.createDialog.selectClient} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{client.client_name}</span>
                        {client.intent && (
                          <span className="text-muted-foreground text-xs">
                            {client.intent}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Connection Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t.createDialog.partnerAgent} *
              </Label>
              <Select
                value={selectedConnection}
                onValueChange={setSelectedConnection}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.createDialog.selectPartner} />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={conn.avatar || ""} />
                          <AvatarFallback className="text-xs">
                            {conn.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{conn.name || conn.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {connections.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t.createDialog.noConnections}{" "}
                  <a href="/connections" className="text-primary hover:underline">
                    {t.createDialog.findAgents}
                  </a>
                </p>
              )}
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label>{t.createDialog.yourRole}</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAmIPropertyAgent(true)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    amIPropertyAgent
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  }`}
                >
                  <Building2
                    className={`h-5 w-5 mb-1 ${
                      amIPropertyAgent ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <p className="font-medium text-sm">{t.createDialog.propertyAgent}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.createDialog.propertyAgentDesc}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setAmIPropertyAgent(false)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    !amIPropertyAgent
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  }`}
                >
                  <Users
                    className={`h-5 w-5 mb-1 ${
                      !amIPropertyAgent ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <p className="font-medium text-sm">{t.createDialog.clientAgent}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.createDialog.clientAgentDesc}
                  </p>
                </button>
              </div>
            </div>

            {/* Commission Split */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                {t.createDialog.commissionSplit}
              </Label>
              <div className="px-2">
                <Slider
                  value={[split]}
                  onValueChange={(v: number[]) => setSplit(v[0])}
                  max={100}
                  min={0}
                  step={5}
                />
              </div>
              <div className="flex justify-between text-sm">
                <div className="text-center">
                  <p className="font-semibold text-blue-600">
                    {amIPropertyAgent ? split : 100 - split}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.createDialog.you} ({amIPropertyAgent ? t.createDialog.propertyShort : t.createDialog.clientShort})
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-green-600">
                    {amIPropertyAgent ? 100 - split : split}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.createDialog.partner} ({amIPropertyAgent ? t.createDialog.clientShort : t.createDialog.propertyShort})
                  </p>
                </div>
              </div>
            </div>

            {/* Total Commission (Optional) */}
            <div className="space-y-2">
              <Label>{t.createDialog.totalCommission}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  €
                </span>
                <Input
                  type="number"
                  value={totalCommission}
                  onChange={(e) => setTotalCommission(e.target.value)}
                  placeholder={t.createDialog.commissionPlaceholder}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>{t.createDialog.notes}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.createDialog.notesPlaceholder}
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t.createDialog.cancel}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              isLoading ||
              isLoadingData ||
              !selectedProperty ||
              !selectedClient ||
              !selectedConnection
            }
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Handshake className="h-4 w-4 mr-2" />
            )}
            {t.createDialog.proposeDeal}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

