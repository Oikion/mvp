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

export function ProgressBar({ steps, currentStep, className, onStepClick }: ProgressBarProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-start justify-between mb-4 relative">
        {/* Connecting lines container - behind icons */}
        <div className="absolute top-4 left-0 right-0 h-0.5 pointer-events-none z-0">
          <div
            className="flex w-full"
            style={{
              paddingLeft: "calc(1rem + 16px)",
              paddingRight: "calc(1rem + 16px)",
            }}
          >
            {steps.slice(0, -1).map((_, index) => {
              const stepIndex = index;
              const isCompleted = currentStep > stepIndex + 1;
              return (
                <div
                  key={`line-${stepIndex}`}
                  className={cn(
                    "h-0.5 flex-1",
                    isCompleted ? "bg-primary" : "bg-muted"
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* Steps container - on top */}
        <div className="flex items-start justify-between w-full relative z-10">
          {steps.map((step) => (
            <div 
              key={step.id} 
              className={cn(
                "flex flex-col items-center flex-1 group",
                onStepClick && "cursor-pointer"
              )}
              onClick={() => onStepClick?.(step.id)}
            >
              {/* Icon circle - solid background to hide line behind */}
              <div className="bg-card rounded-full">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm relative z-10 transition-colors",
                    currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep > step.id
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                  )}
                >
                  {currentStep > step.id ? "✓" : step.id}
                </div>
              </div>
              {/* Label */}
              <div className="text-xs mt-2 text-center max-w-[120px] text-muted-foreground group-hover:text-foreground transition-colors">
                {step.title}
              </div>
            </div>
          ))}
        </div>
      </div>
      {steps[currentStep - 1]?.description && (
        <div className="text-sm text-muted-foreground">
          {steps[currentStep - 1].description}
        </div>
      )}
    </div>
  );
}
