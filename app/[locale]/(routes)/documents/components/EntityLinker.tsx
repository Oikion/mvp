"use client";

import { useState, useEffect } from "react";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Label } from "@/components/ui/label";
import { Users, Home, Calendar, CheckSquare } from "lucide-react";

interface EntityLinkerProps {
  clientOptions?: MultiSelectOption[];
  propertyOptions?: MultiSelectOption[];
  eventOptions?: MultiSelectOption[];
  taskOptions?: MultiSelectOption[];
  selectedClientIds?: string[];
  selectedPropertyIds?: string[];
  selectedEventIds?: string[];
  selectedTaskIds?: string[];
  onClientChange?: (ids: string[]) => void;
  onPropertyChange?: (ids: string[]) => void;
  onEventChange?: (ids: string[]) => void;
  onTaskChange?: (ids: string[]) => void;
  className?: string;
}

export function EntityLinker({
  clientOptions = [],
  propertyOptions = [],
  eventOptions = [],
  taskOptions = [],
  selectedClientIds = [],
  selectedPropertyIds = [],
  selectedEventIds = [],
  selectedTaskIds = [],
  onClientChange,
  onPropertyChange,
  onEventChange,
  onTaskChange,
  className,
}: EntityLinkerProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Clients */}
      {clientOptions.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            Clients
          </Label>
          <MultiSelect
            options={clientOptions}
            value={selectedClientIds}
            onChange={onClientChange || (() => {})}
            placeholder="Select clients..."
            searchPlaceholder="Search clients..."
            emptyMessage="No clients found."
          />
        </div>
      )}

      {/* Properties */}
      {propertyOptions.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Home className="h-4 w-4 text-green-600" />
            Properties
          </Label>
          <MultiSelect
            options={propertyOptions}
            value={selectedPropertyIds}
            onChange={onPropertyChange || (() => {})}
            placeholder="Select properties..."
            searchPlaceholder="Search properties..."
            emptyMessage="No properties found."
          />
        </div>
      )}

      {/* Calendar Events */}
      {eventOptions.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-600" />
            Calendar Events
          </Label>
          <MultiSelect
            options={eventOptions}
            value={selectedEventIds}
            onChange={onEventChange || (() => {})}
            placeholder="Select events..."
            searchPlaceholder="Search events..."
            emptyMessage="No events found."
          />
        </div>
      )}

      {/* Tasks */}
      {taskOptions.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-orange-600" />
            Tasks
          </Label>
          <MultiSelect
            options={taskOptions}
            value={selectedTaskIds}
            onChange={onTaskChange || (() => {})}
            placeholder="Select tasks..."
            searchPlaceholder="Search tasks..."
            emptyMessage="No tasks found."
          />
        </div>
      )}
    </div>
  );
}

