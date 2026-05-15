"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useOrganization } from "@clerk/nextjs";

interface DemoModeContextValue {
  isDemoMode: boolean;
  tourStep: number;
  advanceTour: () => void;
  completeTour: () => void;
  skipTour: () => void;
  markActionComplete: (step: number) => void;
  isActionComplete: (step: number) => boolean;
}

const DemoModeContext = createContext<DemoModeContextValue>({
  isDemoMode: false,
  tourStep: -1,
  advanceTour: () => {},
  completeTour: () => {},
  skipTour: () => {},
  markActionComplete: () => {},
  isActionComplete: () => false,
});

export function useDemoMode(): DemoModeContextValue {
  return useContext(DemoModeContext);
}

async function patchTourStep(step: number): Promise<void> {
  await fetch("/api/user/tour-progress", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step }),
  });
}

interface DemoModeProviderProps {
  children: React.ReactNode;
  initialTourStep: number;
}

export function DemoModeProvider({
  children,
  initialTourStep,
}: DemoModeProviderProps) {
  const { organization } = useOrganization();
  const isDemoMode = organization?.publicMetadata?.isDemo === true;

  const [tourStep, setTourStep] = useState<number>(initialTourStep);
  const completedActions = useRef<Set<number>>(new Set());

  // Mutable ref tracking the latest step value — read by advanceTour so its
  // useCallback has no deps and TourController can safely omit it from the
  // Driver.js effect dep array without stale-closure bugs.
  const tourStepRef = useRef(initialTourStep);

  // Guard against double-call: onNextClick (last step) + onDestroyStarted both
  // call completeTour. This ref makes it idempotent.
  const tourDoneRef = useRef(false);

  const advanceTour = useCallback(async () => {
    const next = tourStepRef.current + 1;
    tourStepRef.current = next;
    setTourStep(next);
    await patchTourStep(next).catch((err) =>
      console.warn("[DemoModeProvider] Failed to persist tour step", err)
    );
  }, []); // stable — reads from ref, not from tourStep state

  const completeTour = useCallback(async () => {
    if (tourDoneRef.current) return;
    tourDoneRef.current = true;
    tourStepRef.current = -1;
    setTourStep(-1);
    await patchTourStep(-1).catch((err) =>
      console.warn("[DemoModeProvider] Failed to persist tour completion", err)
    );
  }, []);

  const skipTour = useCallback(async () => {
    tourStepRef.current = -1;
    setTourStep(-1);
    await patchTourStep(-1).catch((err) =>
      console.warn("[DemoModeProvider] Failed to persist tour skip", err)
    );
  }, []);

  const markActionComplete = useCallback((step: number) => {
    completedActions.current.add(step);
  }, []);

  const isActionComplete = useCallback((step: number): boolean => {
    return completedActions.current.has(step);
  }, []);

  const value = useMemo<DemoModeContextValue>(
    () => ({
      isDemoMode,
      tourStep,
      advanceTour,
      completeTour,
      skipTour,
      markActionComplete,
      isActionComplete,
    }),
    [isDemoMode, tourStep, advanceTour, completeTour, skipTour, markActionComplete, isActionComplete]
  );

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}
