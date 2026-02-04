"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, Lock } from "lucide-react";
import { formatShareUrl } from "@/lib/documents/create-share-link";
import { toast } from "sonner";
import { useLocale } from "next-intl";

interface ShareSettingsProps {
  shareableLink: string | null;
  linkEnabled: boolean;
  passwordProtected: boolean;
  expiresAt: Date | null;
  onLinkEnabledChange: (enabled: boolean) => void;
  onPasswordProtectedChange: (isProtected: boolean) => void;
  onPasswordChange?: (password: string) => void;
  onExpiresAtChange?: (date: Date | null) => void;
  onEnableShare?: () => void;
}

export function ShareSettings({
  shareableLink,
  linkEnabled,
  passwordProtected,
  expiresAt,
  onLinkEnabledChange,
  onPasswordProtectedChange,
  onPasswordChange,
  onExpiresAtChange,
  onEnableShare,
}: ShareSettingsProps) {
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState("");

  const shareUrl = shareableLink ? formatShareUrl(shareableLink, undefined, locale) : null;

  const handleCopy = () => {
    if (!shareUrl) return;
    
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    onPasswordChange?.(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="link-enabled">Enable Public Sharing</Label>
          <p className="text-sm text-muted-foreground">
            Allow access via shareable link
          </p>
        </div>
        <Switch
          id="link-enabled"
          checked={linkEnabled}
          onCheckedChange={(checked) => {
            if (!checked && !shareableLink && onEnableShare) {
              onEnableShare();
            }
            onLinkEnabledChange(checked);
          }}
        />
      </div>

      {linkEnabled && shareUrl && (
        <>
          <div className="space-y-2">
            <Label>Shareable Link</Label>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="password-protected" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password Protection
              </Label>
              <p className="text-sm text-muted-foreground">
                Require password to access
              </p>
            </div>
            <Switch
              id="password-protected"
              checked={passwordProtected}
              onCheckedChange={onPasswordProtectedChange}
            />
          </div>

          {passwordProtected && (
            <div className="space-y-2">
              <Label htmlFor="share-password">Password</Label>
              <Input
                id="share-password"
                type="password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="Enter password"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="expires-at">Expiration Date (Optional)</Label>
            <Input
              id="expires-at"
              type="datetime-local"
              value={expiresAt ? new Date(expiresAt).toISOString().slice(0, 16) : ""}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : null;
                onExpiresAtChange?.(date);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

