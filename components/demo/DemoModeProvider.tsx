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
}

const DemoModeContext = createContext<DemoModeContextValue>({
  isDemoMode: false,
  tourStep: -1,
  advanceTour: () => {},
  completeTour: () => {},
  skipTour: () => {},
  markActionComplete: () => {},
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

  const advanceTour = useCallback(async () => {
    const next = tourStep + 1;
    setTourStep(next);
    await patchTourStep(next);
  }, [tourStep]);

  const completeTour = useCallback(async () => {
    setTourStep(-1);
    await patchTourStep(-1);
  }, []);

  const skipTour = useCallback(async () => {
    setTourStep(-1);
    await patchTourStep(-1);
  }, []);

  const markActionComplete = useCallback((step: number) => {
    completedActions.current.add(step);
  }, []);

  const value = useMemo<DemoModeContextValue>(
    () => ({
      isDemoMode,
      tourStep,
      advanceTour,
      completeTour,
      skipTour,
      markActionComplete,
    }),
    [isDemoMode, tourStep, advanceTour, completeTour, skipTour, markActionComplete]
  );

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}
