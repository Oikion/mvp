"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
  Database,
  Lock,
  Unlock,
  Download,
  Trash2,
  Users,
  AlertTriangle,
  Clock,
  X,
  UserPlus,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  unwrapKey,
  base64ToSalt,
} from "@/lib/crypto";
import {
  setupOrganizationEncryption,
  getOrganizationEncryptionStatus,
  grantEncryptionAccess,
  revokeEncryptionAccess,
  getMembersWithoutAccess,
  getUserWrappedKey,
} from "@/actions/encryption";
import { requestDataExport, getDataExportStatus } from "@/actions/data-export/request-data-export";
import { deleteOrganization } from "@/actions/user/delete-account";
import { Loading } from "@/components/ui/loading";

// =============================================================================
// Types
// =============================================================================

interface AuthorizedUser {
  id: string;
  name: string | null;
  email: string;
  grantedAt: Date;
}

interface MemberWithoutAccess {
  id: string;
  name: string | null;
  email: string;
}

// =============================================================================
// Helper Components
// =============================================================================

function OrgEncryptionStatusBadge({ 
  isEnabled, 
  isUnlocked 
}: { 
  isEnabled: boolean; 
  isUnlocked: boolean; 
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
  return (
    <Badge variant="outline">
      <Lock className="h-3 w-3 mr-1" />
      Locked
    </Badge>
  );
}

function AuthorizedUsersList({
  isLoading,
  users,
  onRevokeAccess,
}: {
  isLoading: boolean;
  users: AuthorizedUser[];
  onRevokeAccess: (userId: string, userName: string | null) => void;
}) {
  if (isLoading) {
    return <Loading variant="dots" size="sm" />;
  }
  
  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No users have encryption access yet.</p>
    );
  }
  
  return (
    <div className="space-y-2">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between p-3 border rounded-lg"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {(user.name || user.email).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{user.name || "No name"}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onRevokeAccess(user.id, user.name)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Encryption Setup Section (Admin)
// =============================================================================

function OrgEncryptionSection() {
  const { isEnabled, isUnlocked, isLoading, unlock, lock, remainingTime, refreshStatus } =
    useEncryption();
  const { toast } = useAppToast();

  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);

  // Load authorized users
  useEffect(() => {
    const loadStatus = async () => {
      const result = await getOrganizationEncryptionStatus();
      if (result.success && result.data) {
        setAuthorizedUsers(result.data.authorizedUsers);
      }
    };
    loadStatus();
  }, [isEnabled]);

  // Handle unlock
  const handleUnlock = async () => {
    if (!passphrase) return;

    setIsSubmitting(true);
    try {
      const unlocked = await unlock(passphrase);
      if (unlocked) {
        toast.success("Encryption unlocked", { isTranslationKey: false });
        setPassphrase("");
      } else {
        toast.error("Invalid passphrase");
      }
    } catch {
      toast.error("Failed to unlock encryption");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle setup
  const handleSetup = async () => {
    const validation = validatePassphrase(passphrase);
    if (!validation.isValid) {
      toast.error(validation.error || "Invalid passphrase");
      return;
    }

    if (passphrase !== confirmPassphrase) {
      toast.error("Passphrases do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const omk = await generateOMK();
      const salt = generateSalt();
      const kek = await deriveKEK(passphrase, salt);
      const wrappedKey = await wrapKey(omk, kek);

      const result = await setupOrganizationEncryption({
        wrappedKey,
        salt: saltToBase64(salt),
      });

      if (result.success) {
        toast.success("Encryption enabled successfully", { isTranslationKey: false });
        setShowSetupDialog(false);
        setPassphrase("");
        setConfirmPassphrase("");
        await refreshStatus();
      } else {
        toast.error(result.error || "Failed to enable encryption");
      }
    } catch (err) {
      console.error("Setup error:", err);
      toast.error("Failed to enable encryption");
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
            Organization Encryption
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
          Organization Encryption
        </CardTitle>
        <CardDescription>
          End-to-end encryption protects all organization data. Only authorized team members can
          decrypt it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <OrgEncryptionStatusBadge isEnabled={isEnabled} isUnlocked={isUnlocked} />
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

        {/* Not enabled - show setup */}
        {!isEnabled && (
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
        {isEnabled && !isUnlocked && (
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

        {/* Unlocked */}
        {isUnlocked && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {remainingTime !== null && (
                <span>
                  Auto-lock in {Math.floor(remainingTime / 60)}:
                  {String(remainingTime % 60).padStart(2, "0")}
                </span>
              )}
            </div>
            <Button variant="outline" onClick={lock}>
              <Lock className="h-4 w-4 mr-2" />
              Lock Now
            </Button>
          </div>
        )}

        {/* Authorized Users Count */}
        {isEnabled && (
          <div className="pt-2">
            <p className="text-sm text-muted-foreground">
              <Users className="h-4 w-4 inline mr-1" />
              {authorizedUsers.length} team member{authorizedUsers.length === 1 ? "" : "s"} with
              access
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Team Access Management Section
// =============================================================================

function TeamAccessSection() {
  const { isEnabled, isUnlocked } = useEncryption();
  const { toast } = useAppToast();

  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [membersWithoutAccess, setMembersWithoutAccess] = useState<MemberWithoutAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithoutAccess | null>(null);
  const [adminPassphrase, setAdminPassphrase] = useState("");
  const [memberPassphrase, setMemberPassphrase] = useState("");
  const [confirmMemberPassphrase, setConfirmMemberPassphrase] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [statusResult, membersResult] = await Promise.all([
          getOrganizationEncryptionStatus(),
          getMembersWithoutAccess(),
        ]);

        if (statusResult.success && statusResult.data) {
          setAuthorizedUsers(statusResult.data.authorizedUsers);
        }
        if (membersResult.success && membersResult.data) {
          setMembersWithoutAccess(membersResult.data);
        }
      } catch (err) {
        console.error("Failed to load team access data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [isEnabled]);

  const handleGrantAccess = async () => {
    if (!selectedMember || !adminPassphrase || !memberPassphrase) return;

    if (memberPassphrase !== confirmMemberPassphrase) {
      toast.error("Passphrases do not match");
      return;
    }

    const validation = validatePassphrase(memberPassphrase);
    if (!validation.isValid) {
      toast.error(validation.error || "Invalid passphrase");
      return;
    }

    setIsSubmitting(true);
    try {
      // Get admin's wrapped key
      const keyResult = await getUserWrappedKey();
      if (!keyResult.success || !keyResult.data) {
        toast.error("Failed to get your encryption key");
        return;
      }

      // Unwrap OMK with admin passphrase
      const adminSalt = base64ToSalt(keyResult.data.salt);
      const adminKek = await deriveKEK(adminPassphrase, adminSalt);
      const omk = await unwrapKey(keyResult.data.wrappedKey, adminKek);

      // Generate member's salt and wrap OMK for them
      const memberSalt = generateSalt();
      const memberKek = await deriveKEK(memberPassphrase, memberSalt);
      const memberWrappedKey = await wrapKey(omk, memberKek);

      // Store on server
      const result = await grantEncryptionAccess({
        targetUserId: selectedMember.id,
        wrappedKey: memberWrappedKey,
        salt: saltToBase64(memberSalt),
      });

      if (result.success) {
        toast.success(`Encryption access granted to ${selectedMember.name || selectedMember.email}`, { isTranslationKey: false });
        setShowGrantDialog(false);
        setSelectedMember(null);
        setAdminPassphrase("");
        setMemberPassphrase("");
        setConfirmMemberPassphrase("");
        // Refresh lists
        const [statusResult, membersResult] = await Promise.all([
          getOrganizationEncryptionStatus(),
          getMembersWithoutAccess(),
        ]);
        if (statusResult.success && statusResult.data) {
          setAuthorizedUsers(statusResult.data.authorizedUsers);
        }
        if (membersResult.success && membersResult.data) {
          setMembersWithoutAccess(membersResult.data);
        }
      } else {
        toast.error(result.error || "Failed to grant access");
      }
    } catch (err) {
      console.error("Grant access error:", err);
      toast.error("Failed to grant access. Check your passphrase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeAccess = async (userId: string, userName: string | null) => {
    if (!confirm(`Revoke encryption access for ${userName || "this user"}?`)) {
      return;
    }

    try {
      const result = await revokeEncryptionAccess(userId);
      if (result.success) {
        toast.success("Access revoked", { isTranslationKey: false });
        setAuthorizedUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        toast.error(result.error || "Failed to revoke access");
      }
    } catch (err) {
      console.error("Revoke access error:", err);
      toast.error("Failed to revoke access");
    }
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Access Management
        </CardTitle>
        <CardDescription>
          Manage which team members can access encrypted data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isUnlocked && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Unlock encryption to manage team access
            </AlertDescription>
          </Alert>
        )}

        {isUnlocked && (
          <>
            {/* Grant Access Button */}
            <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
              <DialogTrigger asChild>
                <Button disabled={membersWithoutAccess.length === 0}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Grant Access
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Grant Encryption Access</DialogTitle>
                  <DialogDescription>
                    Create a passphrase for the team member. They will use this to access encrypted
                    data.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Member Selection */}
                  <fieldset className="space-y-2 border-0 p-0 m-0">
                    <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Select Team Member
                    </legend>
                    <div className="grid gap-2 max-h-40 overflow-y-auto mt-2">
                      {membersWithoutAccess.map((member) => (
                        <button
                          type="button"
                          key={member.id}
                          aria-pressed={selectedMember?.id === member.id}
                          className={`flex items-center gap-3 p-2 rounded border cursor-pointer transition-colors text-left w-full ${
                            selectedMember?.id === member.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-accent"
                          }`}
                          onClick={() => setSelectedMember(member)}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {(member.name || member.email).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.name || "No name"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  {selectedMember && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label htmlFor="admin-pass">Your Passphrase</Label>
                        <Input
                          id="admin-pass"
                          type="password"
                          placeholder="Enter your admin passphrase"
                          value={adminPassphrase}
                          onChange={(e) => setAdminPassphrase(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="member-pass">
                          New Passphrase for {selectedMember.name || selectedMember.email}
                        </Label>
                        <Input
                          id="member-pass"
                          type="password"
                          placeholder="Create a passphrase (12+ characters)"
                          value={memberPassphrase}
                          onChange={(e) => setMemberPassphrase(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-member-pass">Confirm Passphrase</Label>
                        <Input
                          id="confirm-member-pass"
                          type="password"
                          placeholder="Confirm the passphrase"
                          value={confirmMemberPassphrase}
                          onChange={(e) => setConfirmMemberPassphrase(e.target.value)}
                        />
                      </div>
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Share this passphrase with the team member securely. They will need it to
                          access encrypted data.
                        </AlertDescription>
                      </Alert>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowGrantDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGrantAccess}
                    disabled={isSubmitting || !selectedMember || !adminPassphrase || !memberPassphrase}
                  >
                    {isSubmitting ? <Loading variant="spinner" size="sm" /> : "Grant Access"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Separator />

            {/* Authorized Users List */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Authorized Users</h4>
              <AuthorizedUsersList
                isLoading={isLoading}
                users={authorizedUsers}
                onRevokeAccess={handleRevokeAccess}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Organization Data Export Section
// =============================================================================

interface ExportRequest {
  id: string;
  status: string;
  format: string;
  downloadUrl: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}

function OrgExportStatusContent({
  isLoadingStatus,
  pendingExport,
  completedExport,
  isRequesting,
  onRequestExport,
}: {
  isLoadingStatus: boolean;
  pendingExport: ExportRequest | null;
  completedExport: ExportRequest | null;
  isRequesting: boolean;
  onRequestExport: () => void;
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
          Your organization data export is being processed. You will receive an email with the download link.
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
          <p>Your organization data export is ready for download.</p>
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
      <Button variant="outline" onClick={onRequestExport} disabled={isRequesting}>
        {isRequesting ? <Loading variant="spinner" size="sm" /> : <Download className="h-4 w-4 mr-2" />}
        Request Full Export
      </Button>
      <p className="text-sm text-muted-foreground">
        Export includes all clients, properties, documents, and team data. 
        You will receive an email with download link within a few minutes.
      </p>
    </>
  );
}

function OrgDataExportSection() {
  const { toast } = useAppToast();
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

  const handleRequestExport = async () => {
    setIsRequesting(true);
    try {
      const result = await requestDataExport({ processImmediately: true });
      if (result.success) {
        toast.success("Data export request submitted. You will receive an email when ready.", { isTranslationKey: false });
        if (result.data) {
          setPendingExport({
            id: result.data.requestId,
            status: "PENDING",
            format: "json",
            downloadUrl: null,
            expiresAt: null,
            createdAt: new Date(),
          });
        }
      } else {
        toast.error(result.error || "Failed to request data export");
      }
    } catch {
      toast.error("Failed to request data export");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Organization Data
        </CardTitle>
        <CardDescription>
          Download a complete copy of all organization data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <OrgExportStatusContent
          isLoadingStatus={isLoadingStatus}
          pendingExport={pendingExport}
          completedExport={completedExport}
          isRequesting={isRequesting}
          onRequestExport={handleRequestExport}
        />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Organization Deletion Section
// =============================================================================

function OrgDeletionSection() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { toast } = useAppToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDeleteOrganization = async () => {
    if (deleteConfirmation !== "DELETE ORGANIZATION") {
      toast.error("Please type 'DELETE ORGANIZATION' to confirm");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await deleteOrganization(deleteConfirmation);
      if (result.success) {
        toast.success("Organization deleted successfully. You will be redirected.", { isTranslationKey: false });
        setShowDeleteDialog(false);
        // Sign out and redirect to home
        setTimeout(async () => {
          await signOut();
          router.push("/");
        }, 1500);
      } else {
        toast.error(result.error || "Failed to delete organization");
      }
    } catch {
      toast.error("Failed to delete organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Delete Organization
        </CardTitle>
        <CardDescription>
          Permanently delete this organization and all associated data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete Organization</DialogTitle>
              <DialogDescription>
                This will permanently delete your organization and all data including:
              </DialogDescription>
            </DialogHeader>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 py-2">
              <li>All team members and their access</li>
              <li>All properties, clients, and contacts</li>
              <li>All documents, messages, and files</li>
              <li>All encryption keys and settings</li>
              <li>All integrations and API keys</li>
            </ul>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>This action cannot be undone</AlertTitle>
              <AlertDescription>
                Type <strong>DELETE ORGANIZATION</strong> below to confirm.
              </AlertDescription>
            </Alert>
            <Input
              placeholder="Type DELETE ORGANIZATION"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteOrganization}
                disabled={isSubmitting || deleteConfirmation !== "DELETE ORGANIZATION"}
              >
                {isSubmitting ? <Loading variant="spinner" size="sm" /> : "Delete Organization"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <p className="text-sm text-muted-foreground mt-2">
          This action is irreversible. Make sure to export your data first.
        </p>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function OrgDataControlContent() {
  const { resetIdleTimer } = useEncryption();

  // Reset idle timer on activity
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
      <OrgEncryptionSection />
      <TeamAccessSection />
      <OrgDataExportSection />
      <OrgDeletionSection />
    </div>
  );
}
