"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useOrganizationList } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, SkipForward } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

import { finalizeOrganizationSetup } from "@/actions/organization/finalize-organization-setup";
import {
  getConnectionsWithOrgInfo,
  type ConnectionsWithOrgInfo,
} from "@/actions/organization/get-connections-with-org-info";

import { OrgInfoStep } from "./OrgInfoStep";
import { DataPolicyStep } from "./DataPolicyStep";
import { EncryptionPolicyStep } from "./EncryptionPolicyStep";
import { AddTeammatesStep } from "./AddTeammatesStep";
import { EstablishPartnershipsStep } from "./EstablishPartnershipsStep";
import { ReviewStep } from "./ReviewStep";

// =============================================================================
// Constants & Types
// =============================================================================

const TOTAL_STEPS = 6;
const STORAGE_KEY = "oikion-create-org-wizard";

interface TeammateEntry {
  type: "connection" | "manual";
  userId?: string;
  email: string;
  name?: string;
  role: "ADMIN" | "AGENT" | "VIEWER";
}

interface CreateOrgWizardData {
  orgName: string;
  orgSlug: string;
  dataOwnershipMode: "AGENCY" | "AGENT" | null;
  encryptionMode: "STANDARD" | "E2EE" | null;
  teammates: TeammateEntry[];
  partnerOrgIds: string[];
}

const DEFAULT_WIZARD_DATA: CreateOrgWizardData = {
  orgName: "",
  orgSlug: "",
  dataOwnershipMode: null,
  encryptionMode: null,
  teammates: [],
  partnerOrgIds: [],
};

// Animation variants matching OnboardingSteps pattern
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

// Step labels (0-based)
// 0: OrgInfo, 1: DataPolicy, 2: EncryptionPolicy, 3: AddTeammates, 4: EstablishPartnerships, 5: Review

// =============================================================================
// Component
// =============================================================================

export function CreateOrganizationWizard() {
  const t = useTranslations("createOrganization");
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) ?? "el";

  const { createOrganization, setActive } = useOrganizationList();

  // --- Wizard state ---
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [wizardData, setWizardData] = useState<CreateOrgWizardData>(DEFAULT_WIZARD_DATA);
  const [stepValid, setStepValid] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // --- Connection data ---
  const [connectionsData, setConnectionsData] = useState<ConnectionsWithOrgInfo | null>(null);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const connectionsFetchedRef = useRef(false);

  // --- Cancel handler ---
  const handleCancel = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    router.push(`/${locale}/app`);
  }, [locale, router]);

  // =============================================================================
  // sessionStorage restore on mount
  // =============================================================================

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CreateOrgWizardData;
        setWizardData(parsed);
      }
    } catch {
      // Ignore parse errors — start fresh
    }
  }, []);

  // =============================================================================
  // sessionStorage persist on data change
  // =============================================================================

  useEffect(() => {
    const isDefault =
      wizardData.orgName === "" &&
      wizardData.orgSlug === "" &&
      wizardData.dataOwnershipMode === null &&
      wizardData.encryptionMode === null &&
      wizardData.teammates.length === 0 &&
      wizardData.partnerOrgIds.length === 0;

    if (!isDefault) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(wizardData));
      } catch {
        // Storage quota exceeded — ignore
      }
    }
  }, [wizardData]);

  // =============================================================================
  // beforeunload guard
  // =============================================================================

  useEffect(() => {
    const hasData =
      wizardData.orgName !== "" ||
      wizardData.orgSlug !== "" ||
      wizardData.dataOwnershipMode !== null ||
      wizardData.encryptionMode !== null ||
      wizardData.teammates.length > 0 ||
      wizardData.partnerOrgIds.length > 0;

    if (!hasData) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [wizardData]);

  // =============================================================================
  // Connection data prefetch
  // =============================================================================

  const fetchConnections = useCallback(async () => {
    if (connectionsFetchedRef.current) return;
    connectionsFetchedRef.current = true;
    setIsLoadingConnections(true);
    try {
      const result = await getConnectionsWithOrgInfo();
      if (result.success && result.data) {
        setConnectionsData(result.data);
      }
    } catch (err) {
      console.error("[CREATE_ORGANIZATION] Failed to fetch connections", err);
    } finally {
      setIsLoadingConnections(false);
    }
  }, []);

  // Prefetch when reaching step 3 (teammates) or on mount as background task
  useEffect(() => {
    if (currentStep >= 3) {
      fetchConnections();
    }
  }, [currentStep, fetchConnections]);

  // Also kick off a background prefetch on mount (after a short delay to not block render)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConnections();
    }, 2000);
    return () => clearTimeout(timer);
  }, [fetchConnections]);

  // =============================================================================
  // Navigation
  // =============================================================================

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
      setStepValid(false);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
      setStepValid(true); // previous step was already valid
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
      setStepValid(false);
    }
  }, [currentStep]);

  // =============================================================================
  // Validation per step
  // =============================================================================

  const handleValidationChange = useCallback((isValid: boolean) => {
    setStepValid(isValid);
  }, []);

  // Steps 0-2 require validation to proceed; steps 3-4 have Skip; step 5 is Review
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: return stepValid; // OrgInfo — name + slug availability
      case 1: return stepValid; // DataPolicy — mode selected
      case 2: return stepValid; // EncryptionPolicy — mode selected (+ PIN if E2EE)
      case 3: return stepValid; // AddTeammates — no invalid emails (always valid unless bad email)
      case 4: return true;      // Partnerships — always can proceed
      case 5: return true;      // Review — button inside step
      default: return false;
    }
  };

  const showSkip = currentStep === 3 || currentStep === 4;
  const isLastStep = currentStep === TOTAL_STEPS - 1;

  // =============================================================================
  // Data change handlers
  // =============================================================================

  const handleOrgInfoChange = useCallback(
    (data: { orgName: string; orgSlug: string }) => {
      setWizardData((prev) => ({ ...prev, ...data }));
    },
    []
  );

  const handleDataPolicyChange = useCallback(
    (data: { dataOwnershipMode: "AGENCY" | "AGENT" }) => {
      setWizardData((prev) => ({ ...prev, ...data }));
    },
    []
  );

  const handleEncryptionChange = useCallback(
    (data: { encryptionMode: "STANDARD" | "E2EE" }) => {
      setWizardData((prev) => ({ ...prev, ...data }));
    },
    []
  );

  const handleTeammatesChange = useCallback(
    (data: { teammates: TeammateEntry[] }) => {
      setWizardData((prev) => ({ ...prev, teammates: data.teammates }));
    },
    []
  );

  const handlePartnershipsChange = useCallback(
    (data: { partnerOrgIds: string[] }) => {
      setWizardData((prev) => ({ ...prev, partnerOrgIds: data.partnerOrgIds }));
    },
    []
  );

  // =============================================================================
  // partnerNames map for ReviewStep
  // =============================================================================

  const partnerNames = new Map<string, string>(
    (connectionsData?.agencies ?? []).map((a) => [a.orgId, a.orgName])
  );

  // =============================================================================
  // Organization creation
  // =============================================================================

  const handleCreateOrganization = useCallback(async () => {
    if (!createOrganization || !setActive) {
      toast.error(t("review.error"));
      return;
    }

    setIsCreating(true);
    try {
      // Phase 1: Client-side Clerk org creation
      const org = await createOrganization({
        name: wizardData.orgName,
        slug: wizardData.orgSlug,
      });
      await setActive({ organization: org.id });

      // Phase 2: Server action — upsert settings, invite teammates, create partnerships
      const result = await finalizeOrganizationSetup(org.id, {
        encryptionMode: wizardData.encryptionMode!,
        dataOwnershipMode: wizardData.dataOwnershipMode!,
        teammates: wizardData.teammates
          .filter((t) => t.email.trim().length > 0)
          .map((t) => ({ email: t.email, role: t.role })),
        partnerOrgIds: wizardData.partnerOrgIds,
      });

      if (!result.success) {
        toast.error(result.error);
        setIsCreating(false);
        return;
      }

      // Clear persisted wizard state
      sessionStorage.removeItem(STORAGE_KEY);

      // Show any non-fatal warnings
      if (result.data?.warnings?.length) {
        result.data.warnings.forEach((w) => toast.warning(w));
      }
      toast.success(t("review.success"));

      // Redirect to the app dashboard
      router.push(`/${locale}/app`);
    } catch (error) {
      console.error("[CREATE_ORGANIZATION]", error);
      toast.error(t("review.error"));
      setIsCreating(false);
    }
  }, [
    createOrganization,
    setActive,
    wizardData,
    t,
    router,
    locale,
  ]);

  // =============================================================================
  // Step rendering
  // =============================================================================

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <OrgInfoStep
            key="org-info"
            data={{ orgName: wizardData.orgName, orgSlug: wizardData.orgSlug }}
            onDataChange={handleOrgInfoChange}
            onValidationChange={handleValidationChange}
          />
        );
      case 1:
        return (
          <DataPolicyStep
            key="data-policy"
            data={{ dataOwnershipMode: wizardData.dataOwnershipMode }}
            onDataChange={handleDataPolicyChange}
            onValidationChange={handleValidationChange}
          />
        );
      case 2:
        return (
          <EncryptionPolicyStep
            key="encryption-policy"
            data={{ encryptionMode: wizardData.encryptionMode }}
            onDataChange={handleEncryptionChange}
            onValidationChange={handleValidationChange}
          />
        );
      case 3:
        return (
          <AddTeammatesStep
            key="add-teammates"
            data={{ teammates: wizardData.teammates }}
            connectionsData={connectionsData}
            isLoadingConnections={isLoadingConnections}
            onDataChange={handleTeammatesChange}
            onValidationChange={handleValidationChange}
          />
        );
      case 4:
        return (
          <EstablishPartnershipsStep
            key="partnerships"
            data={{ partnerOrgIds: wizardData.partnerOrgIds }}
            connectionsData={connectionsData}
            isLoadingConnections={isLoadingConnections}
            onDataChange={handlePartnershipsChange}
          />
        );
      case 5:
        return (
          <ReviewStep
            key="review"
            data={{
              orgName: wizardData.orgName,
              orgSlug: wizardData.orgSlug,
              dataOwnershipMode: wizardData.dataOwnershipMode,
              encryptionMode: wizardData.encryptionMode,
              teammates: wizardData.teammates.filter((t) => t.email.trim().length > 0),
              partnerOrgIds: wizardData.partnerOrgIds,
            }}
            partnerNames={partnerNames}
            isCreating={isCreating}
            onCreateOrganization={handleCreateOrganization}
          />
        );
      default:
        return null;
    }
  };

  // =============================================================================
  // Progress calculation
  // =============================================================================

  const progress = ((currentStep) / (TOTAL_STEPS - 1)) * 100;

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="flex flex-col gap-6">
        {/* Progress bar + Cancel */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>
              {t("wizard.stepOf", {
                current: currentStep + 1,
                total: TOTAL_STEPS,
              })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              {t("wizard.cancel")}
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
        </motion.div>

        {/* Step content with direction-aware slide animation */}
        <div className="relative min-h-[400px] overflow-x-hidden">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="w-full px-1 sm:px-2"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation — hidden on the Review step (which has its own Create button) */}
        {!isLastStep && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center gap-2 pt-4 border-t"
          >
            {/* Back — hidden on step 0 */}
            {currentStep > 0 ? (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isCreating}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                {t("wizard.back")}
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {/* Skip (optional steps 3 & 4) */}
              {showSkip && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="gap-2"
                >
                  {t("wizard.skip")}
                  <SkipForward className="w-4 h-4" aria-hidden="true" />
                </Button>
              )}

              {/* Next */}
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="gap-2"
              >
                {t("wizard.next")}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>
  );
}
