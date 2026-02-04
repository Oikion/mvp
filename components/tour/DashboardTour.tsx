"use client";

import { useTranslations } from "next-intl";
import { ProductTour, TourStep, useTour } from "./ProductTour";

/**
 * DashboardTour - Guided tour for the main dashboard
 *
 * Shows first-time users how to navigate the main features of the app.
 * The tour only runs once per user (persisted in localStorage).
 *
 * @example
 * ```tsx
 * // In your dashboard layout or page
 * <DashboardTour />
 * ```
 */
export function DashboardTour() {
  const t = useTranslations("common");
  const { isOpen, complete } = useTour("dashboard-intro");

  // Define tour steps with target selectors
  // These selectors should match elements in the dashboard layout
  const steps: TourStep[] = [
    {
      target: "[data-tour='sidebar-toggle']",
      title: "Toggle Sidebar",
      content:
        "Click here to show or hide the navigation sidebar. Use keyboard shortcut CMD+B (or Ctrl+B on Windows) for quick access.",
      placement: "right",
    },
    {
      target: "[data-tour='global-search']",
      title: "Global Search",
      content:
        "Search across all your properties, clients, and documents. Press CMD+K (or Ctrl+K) to open search from anywhere.",
      placement: "bottom",
    },
    {
      target: "[data-tour='notifications']",
      title: "Notifications",
      content:
        "Stay updated with notifications about new messages, appointments, and important updates.",
      placement: "bottom-end",
    },
    {
      target: "[data-tour='quick-add']",
      title: "Quick Actions",
      content:
        "Quickly create new properties, clients, or events from anywhere using these floating buttons.",
      placement: "top",
    },
  ];

  // Don't render if the tour has been completed
  // or if user hasn't explicitly started it
  // The tour should be triggered from a "Start Tour" button
  // or automatically on first visit (configured in parent)

  return (
    <ProductTour
      steps={steps}
      isOpen={isOpen}
      onComplete={complete}
      labels={{
        skip: t("buttons.skip"),
        next: t("buttons.next"),
        previous: t("buttons.previous"),
        finish: t("buttons.finish"),
      }}
    />
  );
}

/**
 * useDashboardTour - Hook for controlling the dashboard tour
 *
 * Use this to programmatically start the tour or check its status.
 *
 * @example
 * ```tsx
 * const { startTour, hasCompletedTour, resetTour } = useDashboardTour();
 *
 * // Show a "Take a tour" button if user hasn't completed it
 * {!hasCompletedTour && (
 *   <Button onClick={startTour}>Take a tour</Button>
 * )}
 * ```
 */
export function useDashboardTour() {
  const { isOpen, hasCompleted, start, complete, reset } =
    useTour("dashboard-intro");

  return {
    isTourOpen: isOpen,
    hasCompletedTour: hasCompleted,
    startTour: start,
    completeTour: complete,
    resetTour: reset,
  };
}

/**
 * TourTriggerButton - A button to manually start the tour
 *
 * Shows a help icon button that users can click to restart the tour.
 *
 * @example
 * ```tsx
 * // In the header or help menu
 * <TourTriggerButton />
 * ```
 */
export function TourTriggerButton() {
  const { startTour } = useDashboardTour();
  const t = useTranslations("common");

  return (
    <button
      onClick={startTour}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      {t("buttons.startTour")}
    </button>
  );
}
