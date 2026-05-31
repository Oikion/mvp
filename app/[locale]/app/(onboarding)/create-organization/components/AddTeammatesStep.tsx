"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Users, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeammateEntry {
  type: "connection" | "manual";
  userId?: string;
  email: string;
  name?: string;
  role: "ADMIN" | "AGENT" | "VIEWER";
}

interface ConnectionTeammate {
  userId: string;
  clerkUserId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface AddTeammatesStepProps {
  data: { teammates: TeammateEntry[] };
  connectionsData: { teammates: ConnectionTeammate[] } | null;
  isLoadingConnections: boolean;
  onDataChange: (data: { teammates: TeammateEntry[] }) => void;
  onValidationChange: (isValid: boolean) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ["ADMIN", "AGENT", "VIEWER"] as const;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AddTeammatesStep({
  data,
  connectionsData,
  isLoadingConnections,
  onDataChange,
  onValidationChange,
}: AddTeammatesStepProps) {
  const t = useTranslations("createOrganization");

  // Track manual row email errors
  const [emailErrors, setEmailErrors] = useState<Record<number, string>>({});

  const connections = connectionsData?.teammates ?? [];
  const selectedConnectionIds = new Set(
    data.teammates
      .filter((tm) => tm.type === "connection" && tm.userId)
      .map((tm) => tm.userId!)
  );
  const manualEntries = data.teammates.filter((tm) => tm.type === "manual");

  // Validate on every data change
  useEffect(() => {
    const hasInvalidManual = manualEntries.some(
      (tm) => tm.email.length > 0 && !EMAIL_REGEX.test(tm.email)
    );
    onValidationChange(!hasInvalidManual);
  }, [data.teammates, manualEntries, onValidationChange]);

  // --- Connection helpers ---

  const toggleConnection = (conn: ConnectionTeammate) => {
    const isSelected = selectedConnectionIds.has(conn.userId);
    if (isSelected) {
      onDataChange({
        teammates: data.teammates.filter(
          (tm) => !(tm.type === "connection" && tm.userId === conn.userId)
        ),
      });
    } else {
      const existing = data.teammates.find(
        (tm) => tm.email === conn.email && tm.type === "manual"
      );
      if (existing) return; // already added manually
      onDataChange({
        teammates: [
          ...data.teammates,
          {
            type: "connection",
            userId: conn.userId,
            email: conn.email,
            name: conn.name,
            role: "AGENT",
          },
        ],
      });
    }
  };

  const updateConnectionRole = (userId: string, role: "ADMIN" | "AGENT" | "VIEWER") => {
    onDataChange({
      teammates: data.teammates.map((tm) =>
        tm.type === "connection" && tm.userId === userId ? { ...tm, role } : tm
      ),
    });
  };

  // --- Manual entry helpers ---

  const addManualRow = () => {
    onDataChange({
      teammates: [
        ...data.teammates,
        { type: "manual", email: "", role: "AGENT" },
      ],
    });
  };

  const updateManualEmail = (index: number, email: string) => {
    const globalIndex = getManualGlobalIndex(index);
    const updated = data.teammates.map((tm, i) =>
      i === globalIndex ? { ...tm, email } : tm
    );
    onDataChange({ teammates: updated });

    // Validate email
    if (email.length > 0 && !EMAIL_REGEX.test(email)) {
      setEmailErrors((prev) => ({ ...prev, [index]: "Invalid email address" }));
    } else {
      setEmailErrors((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  };

  const updateManualRole = (index: number, role: "ADMIN" | "AGENT" | "VIEWER") => {
    const globalIndex = getManualGlobalIndex(index);
    onDataChange({
      teammates: data.teammates.map((tm, i) =>
        i === globalIndex ? { ...tm, role } : tm
      ),
    });
  };

  const removeManualRow = (index: number) => {
    const globalIndex = getManualGlobalIndex(index);
    onDataChange({
      teammates: data.teammates.filter((_, i) => i !== globalIndex),
    });
    setEmailErrors((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = Number(k);
        if (ki < index) next[ki] = v;
        else if (ki > index) next[ki - 1] = v;
      });
      return next;
    });
  };

  // Compute the index in data.teammates for the nth manual entry
  function getManualGlobalIndex(manualIndex: number): number {
    let count = -1;
    for (let i = 0; i < data.teammates.length; i++) {
      if (data.teammates[i].type === "manual") {
        count++;
        if (count === manualIndex) return i;
      }
    }
    return -1;
  }

  return (
    <div className="flex flex-col h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center flex-shrink-0 mb-4"
      >
        <h2 className="text-2xl font-bold mb-2">{t("teammates.title")}</h2>
        <p className="text-muted-foreground">{t("teammates.description")}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1 overflow-y-auto space-y-6 pr-2"
      >
        {/* Personal Connections section */}
        {(isLoadingConnections || connections.length > 0) && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="font-medium text-sm">{t("teammates.connectionsTitle")}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {t("teammates.connectionsDescription")}
            </p>

            {isLoadingConnections ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-lg border bg-muted/30 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {connections.map((conn) => {
                  const isSelected = selectedConnectionIds.has(conn.userId);
                  const selectedEntry = data.teammates.find(
                    (tm) => tm.type === "connection" && tm.userId === conn.userId
                  );
                  return (
                    <div
                      key={conn.userId}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-accent/30"
                      )}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleConnection(conn)}
                        className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                        aria-label={`Select ${conn.name}`}
                      />

                      {/* Avatar */}
                      <div
                        className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0"
                        aria-hidden="true"
                      >
                        {conn.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={conn.avatarUrl}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          getInitials(conn.name)
                        )}
                      </div>

                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{conn.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{conn.email}</p>
                      </div>

                      {/* Role selector */}
                      {isSelected && selectedEntry && (
                        <Select
                          value={selectedEntry.role}
                          onValueChange={(v) =>
                            updateConnectionRole(conn.userId, v as "ADMIN" | "AGENT" | "VIEWER")
                          }
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r} className="text-xs">
                                {t(`teammates.roles.${r}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Manual Invite section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h3 className="font-medium text-sm">{t("teammates.manualTitle")}</h3>
          </div>

          <div className="space-y-2">
            {manualEntries.map((entry, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-1 space-y-1">
                  <Input
                    type="email"
                    value={entry.email}
                    onChange={(e) => updateManualEmail(index, e.target.value)}
                    placeholder={t("teammates.emailPlaceholder")}
                    aria-label={t("teammates.emailLabel")}
                    aria-invalid={!!emailErrors[index]}
                    aria-describedby={emailErrors[index] ? `email-error-${index}` : undefined}
                    className={cn(
                      emailErrors[index] && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {emailErrors[index] && (
                    <p
                      id={`email-error-${index}`}
                      className="text-xs text-destructive"
                    >
                      {emailErrors[index]}
                    </p>
                  )}
                </div>

                <Select
                  value={entry.role}
                  onValueChange={(v) =>
                    updateManualRole(index, v as "ADMIN" | "AGENT" | "VIEWER")
                  }
                >
                  <SelectTrigger className="w-28 h-10" aria-label={t("teammates.roleLabel")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {t(`teammates.roles.${r}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeManualRow(index)}
                  aria-label={t("teammates.remove")}
                  className="h-10 w-10 text-muted-foreground hover:text-destructive pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addManualRow}
            className="mt-3"
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            {t("teammates.addAnother")}
          </Button>
        </section>
      </motion.div>
    </div>
  );
}
