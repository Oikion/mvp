"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Database, Lock, Unlock, Download, Trash2, UserX, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEncryption } from "@/components/providers/EncryptionProvider";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  validatePassphrase,
  generateSalt,
  deriveKEK,
  saltToBase64,
  generateOMK,
  wrapKey,
} from "@/lib/crypto";
import { setupOrganizationEncryption } from "@/actions/encryption";
import { requestDataExport, getDataExportStatus } from "@/actions/data-export/request-data-export";
import { disableAccount } from "@/actions/user/disable-account";
import { deleteAccount } from "@/actions/user/delete-account";
import { useHasPermission } from "@/lib/permissions/hooks";
import { Loading } from "@/components/ui/loading";

// =============================================================================
// Helper Components
// =============================================================================

function EncryptionStatusBadge({ 
  isEnabled, 
  isUnlocked, 
  hasAccess 
}: { 
  isEnabled: boolean; 
  isUnlocked: boolean; 
  hasAccess: boolean; 
}) {
  if (!isEnabled) {
    return <Badge variant="secondary">Not Configured</Badge>;
  }
  if (isUnlocked) {
    return (
      <Badge variant="default" className="bg-green-600">
        <Unlock className="h-3 w-3 mr-1" />
        Unlocked
      </Badge>
    );
  }
  if (hasAccess) {
    return (
      <Badge variant="outline">
        <Lock className="h-3 w-3 mr-1" />
        Locked
      </Badge>
    );
  }
  return <Badge variant="destructive">No Access</Badge>;
}

// =============================================================================
// Encryption Setup Section
// =============================================================================

function EncryptionSetupSection() {
  const { isEnabled, hasAccess, isUnlocked, isLoading, unlock, lock, remainingTime, refreshStatus } = useEncryption();
  const isAdmin = useHasPermission("canManageRoles");
  const { toast } = useAppToast();
  const success = (msg: string) => toast.success(msg, { isTranslationKey: false });
  const showError = (msg: string) => toast.error(msg, { isTranslationKey: false });
  
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);

  // Handle unlock
  const handleUnlock = async () => {
    if (!passphrase) return;
    
    setIsSubmitting(true);
    try {
      const unlocked = await unlock(passphrase);
      if (unlocked) {
        success("Encryption unlocked");
        setPassphrase("");
      } else {
        showError("Invalid passphrase");
      }
    } catch {
      showError("Failed to unlock encryption");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle setup
  const handleSetup = async () => {
    // Validate passphrase
    const validation = validatePassphrase(passphrase);
    if (!validation.isValid) {
      showError(validation.error || "Invalid passphrase");
      return;
    }

    if (passphrase !== confirmPassphrase) {
      showError("Passphrases do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate OMK
      const omk = await generateOMK();
      
      // Generate salt and derive KEK
      const salt = generateSalt();
      const kek = await deriveKEK(passphrase, salt);
      
      // Wrap OMK with KEK
      const wrappedKey = await wrapKey(omk, kek);
      
      // Store on server
      const result = await setupOrganizationEncryption({
        wrappedKey,
        salt: saltToBase64(salt),
      });

      if (result.success) {
        success("Encryption enabled successfully");
        setShowSetupDialog(false);
        setPassphrase("");
        setConfirmPassphrase("");
        await refreshStatus();
      } else {
        showError(result.error || "Failed to enable encryption");
      }
    } catch (err) {
      console.error("Setup error:", err);
      showError("Failed to enable encryption");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Encryption
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Loading variant="dots" size="md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Encryption
        </CardTitle>
        <CardDescription>
          End-to-end encryption protects your data so only authorized team members can access it
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <EncryptionStatusBadge isEnabled={isEnabled} isUnlocked={isUnlocked} hasAccess={hasAccess} />
        </div>

        {/* Remaining time warning */}
        {isUnlocked && remainingTime !== null && remainingTime <= 60 && (
          <Alert variant="destructive">
            <Clock className="h-4 w-4" />
            <AlertTitle>Auto-lock Warning</AlertTitle>
            <AlertDescription>
              Your session will lock in {remainingTime} seconds due to inactivity.
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Not enabled - show setup for admins */}
        {!isEnabled && isAdmin && (
          <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
            <DialogTrigger asChild>
              <Button>
                <Lock className="h-4 w-4 mr-2" />
                Enable Encryption
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enable End-to-End Encryption</DialogTitle>
                <DialogDescription>
                  Create a secure passphrase to protect your organization&apos;s data. 
                  This passphrase will be required to access encrypted data.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    Store this passphrase securely. If lost, encrypted data cannot be recovered.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="setup-passphrase">Passphrase</Label>
                  <Input
                    id="setup-passphrase"
                    type="password"
                    placeholder="Enter a strong passphrase (12+ characters)"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must contain uppercase, lowercase, and numbers
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-passphrase">Confirm Passphrase</Label>
                  <Input
                    id="confirm-passphrase"
                    type="password"
                    placeholder="Confirm your passphrase"
                    value={confirmPassphrase}
                    onChange={(e) => setConfirmPassphrase(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSetup} disabled={isSubmitting}>
                  {isSubmitting ? <Loading variant="spinner" size="sm" /> : "Enable Encryption"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Enabled but locked - show unlock */}
        {isEnabled && hasAccess && !isUnlocked && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unlock-passphrase">Passphrase</Label>
              <div className="flex gap-2">
                <Input
                  id="unlock-passphrase"
                  type="password"
                  placeholder="Enter your passphrase"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                />
                <Button onClick={handleUnlock} disabled={isSubmitting || !passphrase}>
                  {isSubmitting ? <Loading variant="spinner" size="sm" /> : <Unlock className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Unlocked - show lock button */}
        {isUnlocked && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {remainingTime !== null && (
                <span>Auto-lock in {Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, "0")}</span>
              )}
            </div>
            <Button variant="outline" onClick={lock}>
              <Lock className="h-4 w-4 mr-2" />
              Lock Now
            </Button>
          </div>
        )}

        {/* No access */}
        {isEnabled && !hasAccess && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Access Required</AlertTitle>
            <AlertDescription>
              You don&apos;t have encryption access. Contact your organization admin to be granted access.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Data Request Section
// =============================================================================

interface ExportRequest {
  id: string;
  status: string;
  format: string;
  downloadUrl: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}

function ExportStatusContent({
  isLoadingStatus,
  pendingExport,
  completedExport,
  isRequesting,
  onRequestData,
}: {
  isLoadingStatus: boolean;
  pendingExport: ExportRequest | null;
  completedExport: ExportRequest | null;
  isRequesting: boolean;
  onRequestData: () => void;
}) {
  if (isLoadingStatus) {
    return <Loading variant="dots" size="sm" />;
  }

  if (pendingExport) {
    return (
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertTitle>Export in Progress</AlertTitle>
        <AlertDescription>
          Your data export is being processed. You will receive an email with the download link.
        </AlertDescription>
      </Alert>
    );
  }

  if (completedExport?.downloadUrl) {
    return (
      <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
        <Download className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-700 dark:text-green-400">Export Ready</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>Your data export is ready for download.</p>
          <a
            href={completedExport.downloadUrl}
            download
            className="inline-flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400 underline"
          >
            <Download className="h-3 w-3" />
            Download Export
          </a>
          {completedExport.expiresAt && (
            <p className="text-xs text-muted-foreground">
              Expires: {new Date(completedExport.expiresAt).toLocaleDateString()}
            </p>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Button variant="outline" onClick={onRequestData} disabled={isRequesting}>
        {isRequesting ? <Loading variant="spinner" size="sm" /> : <Download className="h-4 w-4 mr-2" />}
        Request Data Export
      </Button>
      <p className="text-sm text-muted-foreground">
        Your data will be prepared and sent to your email within a few minutes.
      </p>
    </>
  );
}

function DataRequestSection() {
  const { toast } = useAppToast();
  const success = (msg: string) => toast.success(msg, { isTranslationKey: false });
  const showError = (msg: string) => toast.error(msg, { isTranslationKey: false });
  const [isRequesting, setIsRequesting] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [pendingExport, setPendingExport] = useState<ExportRequest | null>(null);
  const [completedExport, setCompletedExport] = useState<ExportRequest | null>(null);

  // Load existing export status on mount
  useEffect(() => {
    async function loadExportStatus() {
      try {
        const result = await getDataExportStatus();
        if (result.success && result.data?.requests) {
          const pending = result.data.requests.find(
            (r) => r.status === "PENDING" || r.status === "PROCESSING"
          );
          const completed = result.data.requests.find(
            (r) => r.status === "COMPLETED" && r.downloadUrl
          );
          setPendingExport(pending ? (pending as ExportRequest) : null);
          setCompletedExport(completed ? (completed as ExportRequest) : null);
        }
      } catch (err) {
        console.error("Failed to load export status:", err);
      } finally {
        setIsLoadingStatus(false);
      }
    }
    loadExportStatus();
  }, []);

  const handleRequestData = async () => {
    setIsRequesting(true);
    try {
      const result = await requestDataExport({ processImmediately: true });
      if (result.success && result.data) {
        success("Data export request submitted. You will receive an email when ready.");
        setPendingExport({
          id: result.data.requestId,
          status: "PENDING",
          format: "json",
          downloadUrl: null,
          expiresAt: null,
          createdAt: new Date(),
        });
      } else {
        showError(!result.success ? result.error : "Failed to request data export");
      }
    } catch {
      showError("Failed to request data export");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Request My Data
        </CardTitle>
        <CardDescription>
          Download a copy of all your organization&apos;s data in JSON format
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ExportStatusContent
          isLoadingStatus={isLoadingStatus}
          pendingExport={pendingExport}
          completedExport={completedExport}
          isRequesting={isRequesting}
          onRequestData={handleRequestData}
        />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Account Actions Section
// =============================================================================

function AccountActionsSection() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { toast } = useAppToast();
  const success = (msg: string) => toast.success(msg, { isTranslationKey: false });
  const showError = (msg: string) => toast.error(msg, { isTranslationKey: false });
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDisableAccount = async () => {
    setIsSubmitting(true);
    try {
      const result = await disableAccount();
      if (result.success) {
        success("Account disabled successfully. You will be logged out.");
        setShowDisableDialog(false);
        // Sign out and redirect to home
        setTimeout(async () => {
          await signOut();
          router.push("/");
        }, 1500);
      } else {
        showError(result.error || "Failed to disable account");
      }
    } catch {
      showError("Failed to disable account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE MY DATA") {
      showError("Please type 'DELETE MY DATA' to confirm");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await deleteAccount(deleteConfirmation);
      if (result.success) {
        success("Account deleted successfully. You will be redirected.");
        setShowDeleteDialog(false);
        // Sign out and redirect to home
        setTimeout(async () => {
          await signOut();
          router.push("/");
        }, 1500);
      } else {
        showError(result.error || "Failed to delete account");
      }
    } catch {
      showError("Failed to delete account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Account Actions
        </CardTitle>
        <CardDescription>
          Manage your account status and data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Disable Account */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h4 className="font-medium flex items-center gap-2">
              <UserX className="h-4 w-4" />
              Disable Account
            </h4>
            <p className="text-sm text-muted-foreground">
              Temporarily disable your account. You can re-enable it later.
            </p>
          </div>
          <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">Disable</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Disable Account</DialogTitle>
                <DialogDescription>
                  Your account will be disabled and you will be logged out. 
                  Your data will be preserved and you can re-enable your account by contacting support.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDisableAccount} disabled={isSubmitting}>
                  {isSubmitting ? <Loading variant="spinner" size="sm" /> : "Disable Account"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Delete Account */}
        <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg bg-destructive/5">
          <div>
            <h4 className="font-medium flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete My Data
            </h4>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
          </div>
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-destructive">Delete Account</DialogTitle>
                <DialogDescription>
                  This will permanently delete your account and all data including:
                </DialogDescription>
              </DialogHeader>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 py-2">
                <li>All your personal information</li>
                <li>All properties, clients, and contacts you created</li>
                <li>All messages and documents</li>
                <li>Your encryption access and keys</li>
              </ul>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>This action cannot be undone</AlertTitle>
                <AlertDescription>
                  Type <strong>DELETE MY DATA</strong> below to confirm.
                </AlertDescription>
              </Alert>
              <Input
                placeholder="Type DELETE MY DATA"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAccount} 
                  disabled={isSubmitting || deleteConfirmation !== "DELETE MY DATA"}
                >
                  {isSubmitting ? <Loading variant="spinner" size="sm" /> : "Delete Account"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function DataControlTab() {
  const { resetIdleTimer } = useEncryption();

  // Reset idle timer on any activity in this tab
  useEffect(() => {
    const handleActivity = () => resetIdleTimer();
    
    globalThis.addEventListener("mousemove", handleActivity);
    globalThis.addEventListener("keydown", handleActivity);
    globalThis.addEventListener("click", handleActivity);
    
    return () => {
      globalThis.removeEventListener("mousemove", handleActivity);
      globalThis.removeEventListener("keydown", handleActivity);
      globalThis.removeEventListener("click", handleActivity);
    };
  }, [resetIdleTimer]);

  return (
    <div className="space-y-6">
      <EncryptionSetupSection />
      <DataRequestSection />
      <AccountActionsSection />
    </div>
  );
}
