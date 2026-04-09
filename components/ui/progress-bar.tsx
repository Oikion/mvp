"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  title: string;
  description?: string;
}

interface ProgressBarProps {
  steps: Step[];
  currentStep: number;
  className?: string;
  onStepClick?: (stepId: number) => void;
}

export function ProgressBar({ steps, currentStep, className, onStepClick }: Readonly<ProgressBarProps>) {
  return (
    <div className={cn("w-full", className)} data-progress-bar>
      <div className="flex items-start justify-between mb-4 relative">
        {/* Connecting lines container - behind icons, clipped to circle centers */}
        <div
          className="absolute top-4 left-0 right-0 h-0.5 pointer-events-none z-0"
          style={{
            // Each step is 1/N of the width. The line starts at the center of the
            // first step and ends at the center of the last step, so we inset by
            // half a step-width on each side: 100% / (2 * N).
            marginLeft: `calc(100% / ${steps.length} / 2)`,
            marginRight: `calc(100% / ${steps.length} / 2)`,
          }}
        >
          <div className="flex w-full">
            {steps.slice(0, -1).map((_, index) => {
              const isCompleted = currentStep > index + 1;
              return (
                <div
                  key={`line-${index}`}
                  className={cn(
                    "h-0.5 flex-1",
                    isCompleted ? "bg-primary" : "bg-muted progress-bar-connection-incomplete"
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* Steps container - on top */}
        <ol role="list" className="flex items-start justify-between w-full relative z-10 list-none m-0 p-0">
          {steps.map((step) => {
            const isCurrent = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const isFuture = currentStep < step.id;
            const stepLabel = `Step ${step.id} of ${steps.length}: ${step.title}${isCurrent ? " (current)" : ""}`;
            const stepContent = (
              <>
                {/* Icon circle - solid background to hide line behind */}
                <div className="bg-card rounded-full">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm relative z-10 transition-colors",
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : isCompleted
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                    )}
                  >
                    {isCompleted ? (
                      <>
                        <span aria-hidden="true">✓</span>
                        <span className="sr-only">completed</span>
                      </>
                    ) : (
                      <span aria-hidden="true">{step.id}</span>
                    )}
                  </div>
                </div>
                {/* Label */}
                <div
                  className="text-xs mt-2 text-center max-w-[120px] text-muted-foreground group-hover:text-foreground transition-colors"
                  title={step.title}
                >
                  {step.title}
                </div>
              </>
            );
            return (
              <li key={step.id} className="flex-1 flex">
                {onStepClick ? (
                  <button
                    type="button"
                    className={cn(
                      "flex flex-col items-center flex-1 group cursor-pointer border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
                    )}
                    onClick={() => onStepClick(step.id)}
                    aria-label={stepLabel}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-disabled={isFuture ? "true" : undefined}
                  >
                    {stepContent}
                  </button>
                ) : (
                  <div
                    className="flex flex-col items-center flex-1 group"
                    aria-label={stepLabel}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {stepContent}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      {steps[currentStep - 1]?.description && (
        <div className="text-sm text-muted-foreground">
          {steps[currentStep - 1].description}
        </div>
      )}
    </div>
  );
}
