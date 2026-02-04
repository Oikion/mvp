"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateChannel } from "@/hooks/swr/useMessaging";
import { Loader2, Hash, Lock, Megaphone } from "lucide-react";
import { ChannelType } from "@prisma/client";

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateChannelDialog({ open, onOpenChange }: CreateChannelDialogProps) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channelType, setChannelType] = useState<ChannelType>("PUBLIC");
  const [isDefault, setIsDefault] = useState(false);
  
  const { createChannel, isCreating, error } = useCreateChannel();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    try {
      const result = await createChannel({
        name: name.trim(),
        description: description.trim() || undefined,
        channelType,
        isDefault,
      });

      if (result?.channel) {
        // Navigate to the new channel
        router.push(`/${locale}/app/messages?channelId=${result.channel.id}`);
        onOpenChange(false);
        // Reset form
        setName("");
        setDescription("");
        setChannelType("PUBLIC");
        setIsDefault(false);
      }
    } catch (err) {
      console.error("Failed to create channel:", err);
    }
  };

  const channelTypeIcons = {
    PUBLIC: <Hash className="h-4 w-4" />,
    PRIVATE: <Lock className="h-4 w-4" />,
    ANNOUNCEMENT: <Megaphone className="h-4 w-4" />,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Create Channel
            </DialogTitle>
            <DialogDescription>
              Channels are where your team communicates. They're best organized around a topic.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Channel name</Label>
              <Input
                id="name"
                placeholder="e.g. general, announcements, random"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isCreating}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What's this channel about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isCreating}
                rows={2}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="type">Channel type</Label>
              <Select
                value={channelType}
                onValueChange={(value) => setChannelType(value as ChannelType)}
                disabled={isCreating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Public</div>
                        <div className="text-xs text-muted-foreground">Anyone in the org can join</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="PRIVATE">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Private</div>
                        <div className="text-xs text-muted-foreground">Only invited members can see</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="ANNOUNCEMENT">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Announcement</div>
                        <div className="text-xs text-muted-foreground">Only admins can post</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="default">Auto-join for new members</Label>
                <p className="text-xs text-muted-foreground">
                  New org members will automatically join this channel
                </p>
              </div>
              <Switch
                id="default"
                checked={isDefault}
                onCheckedChange={setIsDefault}
                disabled={isCreating}
              />
            </div>
            
            {error && (
              <p className="text-sm text-destructive">{error.message}</p>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Channel"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
