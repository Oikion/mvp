"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  Users,
  Workflow,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import {
  listAvailableWorkflows,
  getWorkflowAssignments,
  assignWorkflowToAgent,
  removeWorkflowAssignment,
  toggleWorkflowAssignment,
  type WorkflowAssignment,
} from "@/actions/n8n";
import type { N8nWorkflow } from "@/lib/n8n-admin";

interface OrgMember {
  id: string;
  clerkUserId: string;
  name: string | null;
  email: string;
  avatar: string | null;
}

interface N8nWorkflowAssignmentsProps {
  isConfigured: boolean;
  isActive: boolean;
  members: OrgMember[];
  onUpdate?: () => void;
}

export function N8nWorkflowAssignments({
  isConfigured,
  isActive,
  members,
  onUpdate,
}: N8nWorkflowAssignmentsProps) {
  const locale = useLocale() as "en" | "el";
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [assignments, setAssignments] = useState<WorkflowAssignment[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>("");
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (isConfigured && isActive) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isConfigured, isActive]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [workflowsResult, assignmentsResult] = await Promise.all([
        listAvailableWorkflows(),
        getWorkflowAssignments(),
      ]);

      if (workflowsResult.success && workflowsResult.data) {
        setWorkflows(workflowsResult.data);
      }

      if (assignmentsResult.success && assignmentsResult.data) {
        setAssignments(assignmentsResult.data);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error(
        locale === "el"
          ? "Αποτυχία φόρτωσης δεδομένων"
          : "Failed to load data"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedWorkflow || !selectedAgent) {
      toast.error(
        locale === "el"
          ? "Επιλέξτε ροή εργασίας και πράκτορα"
          : "Please select a workflow and agent"
      );
      return;
    }

    const workflow = workflows.find((w) => w.id === selectedWorkflow);
    if (!workflow) return;

    setAssigning(true);
    try {
      const result = await assignWorkflowToAgent(
        selectedWorkflow,
        selectedAgent,
        workflow.name
      );

      if (result.success) {
        toast.success(
          locale === "el"
            ? "Η ροή εργασίας ανατέθηκε"
            : "Workflow assigned successfully"
        );
        setAddDialogOpen(false);
        setSelectedWorkflow("");
        setSelectedAgent("");
        loadData();
        onUpdate?.();
      } else {
        toast.error(result.error || "Failed to assign workflow");
      }
    } catch (error) {
      toast.error(
        locale === "el"
          ? "Αποτυχία ανάθεσης"
          : "Failed to assign workflow"
      );
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    setRemovingId(assignmentId);
    try {
      const result = await removeWorkflowAssignment(assignmentId);

      if (result.success) {
        toast.success(
          locale === "el"
            ? "Η ανάθεση αφαιρέθηκε"
            : "Assignment removed"
        );
        loadData();
        onUpdate?.();
      } else {
        toast.error(result.error || "Failed to remove assignment");
      }
    } catch (error) {
      toast.error(
        locale === "el"
          ? "Αποτυχία αφαίρεσης"
          : "Failed to remove assignment"
      );
    } finally {
      setRemovingId(null);
    }
  };

  const handleToggle = async (assignmentId: string, isActive: boolean) => {
    setTogglingId(assignmentId);
    try {
      const result = await toggleWorkflowAssignment(assignmentId, isActive);

      if (result.success) {
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === assignmentId ? { ...a, isActive } : a
          )
        );
        onUpdate?.();
      } else {
        toast.error(result.error || "Failed to update assignment");
      }
    } catch (error) {
      toast.error(
        locale === "el"
          ? "Αποτυχία ενημέρωσης"
          : "Failed to update assignment"
      );
    } finally {
      setTogglingId(null);
    }
  };

  const getMemberName = (agentId: string): string => {
    const member = members.find((m) => m.clerkUserId === agentId);
    return member?.name || member?.email || agentId;
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return (
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          {locale === "el" ? "Ποτέ" : "Never"}
        </Badge>
      );
    }

    if (status === "success") {
      return (
        <Badge className="bg-success/10 text-success">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {locale === "el" ? "Επιτυχία" : "Success"}
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        {locale === "el" ? "Σφάλμα" : "Error"}
      </Badge>
    );
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-US", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(date));
  };

  // Not configured or not active
  if (!isConfigured || !isActive) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {locale === "el" ? "Αναθέσεις Ροών Εργασίας" : "Workflow Assignments"}
          </CardTitle>
          <CardDescription>
            {locale === "el"
              ? "Αναθέστε ροές εργασίας n8n σε μέλη του οργανισμού"
              : "Assign n8n workflows to organization members"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {!isConfigured
              ? (locale === "el"
                  ? "Παρακαλώ διαμορφώστε πρώτα τη σύνδεση n8n"
                  : "Please configure the n8n connection first")
              : (locale === "el"
                  ? "Παρακαλώ ενεργοποιήστε την ενσωμάτωση n8n"
                  : "Please enable the n8n integration first")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {locale === "el" ? "Αναθέσεις Ροών Εργασίας" : "Workflow Assignments"}
            </CardTitle>
            <CardDescription>
              {locale === "el"
                ? "Αναθέστε ροές εργασίας n8n σε μέλη του οργανισμού"
                : "Assign n8n workflows to organization members"}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {locale === "el" ? "Ανανέωση" : "Refresh"}
            </Button>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {locale === "el" ? "Νέα Ανάθεση" : "New Assignment"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {locale === "el" ? "Ανάθεση Ροής Εργασίας" : "Assign Workflow"}
                  </DialogTitle>
                  <DialogDescription>
                    {locale === "el"
                      ? "Επιλέξτε μια ροή εργασίας και έναν πράκτορα"
                      : "Select a workflow and an agent"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {locale === "el" ? "Ροή Εργασίας" : "Workflow"}
                    </label>
                    <Select
                      value={selectedWorkflow}
                      onValueChange={setSelectedWorkflow}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            locale === "el"
                              ? "Επιλέξτε ροή εργασίας"
                              : "Select workflow"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {workflows.map((workflow) => (
                          <SelectItem key={workflow.id} value={workflow.id}>
                            <div className="flex items-center gap-2">
                              <Workflow className="h-4 w-4" />
                              {workflow.name}
                              {workflow.active && (
                                <Badge variant="outline" className="ml-2">
                                  {locale === "el" ? "Ενεργό" : "Active"}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {locale === "el" ? "Πράκτορας" : "Agent"}
                    </label>
                    <Select
                      value={selectedAgent}
                      onValueChange={setSelectedAgent}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            locale === "el"
                              ? "Επιλέξτε πράκτορα"
                              : "Select agent"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem
                            key={member.clerkUserId}
                            value={member.clerkUserId}
                          >
                            {member.name || member.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAddDialogOpen(false)}
                  >
                    {locale === "el" ? "Ακύρωση" : "Cancel"}
                  </Button>
                  <Button onClick={handleAssign} disabled={assigning}>
                    {assigning && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {locale === "el" ? "Ανάθεση" : "Assign"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {locale === "el"
                ? "Δεν υπάρχουν αναθέσεις"
                : "No assignments yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {locale === "el"
                ? "Κάντε κλικ στο 'Νέα Ανάθεση' για να ξεκινήσετε"
                : "Click 'New Assignment' to get started"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{locale === "el" ? "Ροή Εργασίας" : "Workflow"}</TableHead>
                <TableHead>{locale === "el" ? "Πράκτορας" : "Agent"}</TableHead>
                <TableHead>{locale === "el" ? "Κατάσταση" : "Status"}</TableHead>
                <TableHead>{locale === "el" ? "Τελευταία Εκτέλεση" : "Last Run"}</TableHead>
                <TableHead>{locale === "el" ? "Ενεργό" : "Active"}</TableHead>
                <TableHead className="text-right">
                  {locale === "el" ? "Ενέργειες" : "Actions"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Workflow className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{assignment.workflowName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getMemberName(assignment.agentId)}</TableCell>
                  <TableCell>{getStatusBadge(assignment.lastRunStatus)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(assignment.lastRunAt)}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={assignment.isActive}
                      onCheckedChange={(checked) =>
                        handleToggle(assignment.id, checked)
                      }
                      disabled={togglingId === assignment.id}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(assignment.id)}
                      disabled={removingId === assignment.id}
                    >
                      {removingId === assignment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
