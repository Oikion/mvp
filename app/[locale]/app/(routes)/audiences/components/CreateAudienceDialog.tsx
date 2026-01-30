"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppToast } from "@/hooks/use-app-toast";
import { Users, Building2, Loader2 } from "lucide-react";

interface CreateAudienceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType: "personal" | "org";
  onSuccess: () => void;
  translations: any;
}

export function CreateAudienceDialog({
  open,
  onOpenChange,
  defaultType,
  onSuccess,
  translations: t,
}: CreateAudienceDialogProps) {
  const [type, setType] = useState<"personal" | "org">(defaultType);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isAutoSync, setIsAutoSync] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useAppToast();

  // Reset form when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setType(defaultType);
      setName("");
      setDescription("");
      setIsAutoSync(true);
    }
    onOpenChange(open);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t.toast.nameRequired, { description: t.toast.nameRequiredDescription, isTranslationKey: false });
      return;
    }

    try {
      setIsLoading(true);
      await axios.post("/api/audiences", {
        name: name.trim(),
        description: description.trim() || null,
        isOrgLevel: type === "org",
        isAutoSync: type === "org" ? isAutoSync : false,
      });

      toast.success(t.toast.created, { description: `"${name}" ${t.toast.createdDescription}`, isTranslationKey: false });

      onSuccess();
      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t.toast.error,
        description: error.response?.data || t.toast.errorCreate,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t.createDialog.title}</DialogTitle>
          <DialogDescription>
            {t.createDialog.description}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={type} onValueChange={(v) => setType(v as "personal" | "org")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal">
              <Users className="h-4 w-4" />
              {t.tabs.personal}
            </TabsTrigger>
            <TabsTrigger value="org">
              <Building2 className="h-4 w-4" />
              {t.tabs.organization}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              {t.createDialog.personalInfo}
            </p>
          </TabsContent>

          <TabsContent value="org" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              {t.createDialog.orgInfo}
            </p>
          </TabsContent>
        </Tabs>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.createDialog.nameLabel} *</Label>
            <Input
              id="name"
              placeholder={type === "org" ? t.createDialog.namePlaceholderOrg : t.createDialog.namePlaceholderPersonal}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t.createDialog.descriptionLabel}</Label>
            <Textarea
              id="description"
              placeholder={t.createDialog.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {type === "org" && (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">{t.createDialog.autoSyncLabel}</Label>
                <p className="text-sm text-muted-foreground">
                  {t.createDialog.autoSyncDescription}
                </p>
              </div>
              <Switch
                checked={isAutoSync}
                onCheckedChange={setIsAutoSync}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t.createDialog.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !name.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t.createDialog.creating}
              </>
            ) : (
              t.createDialog.create
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


