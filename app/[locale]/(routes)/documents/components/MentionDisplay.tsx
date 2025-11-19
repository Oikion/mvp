"use client";

import { Badge } from "@/components/ui/badge";
import { Users, Home, Calendar, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MentionData {
  clients?: Array<{ id: string; name: string }>;
  properties?: Array<{ id: string; name: string }>;
  events?: Array<{ id: string; title: string }>;
  tasks?: Array<{ id: string; title: string }>;
}

interface MentionDisplayProps {
  mentions: MentionData | null | undefined;
  className?: string;
  onMentionClick?: (type: string, id: string) => void;
}

export function MentionDisplay({ mentions, className, onMentionClick }: MentionDisplayProps) {
  if (!mentions || (!mentions.clients?.length && !mentions.properties?.length && !mentions.events?.length && !mentions.tasks?.length)) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {/* Clients - Blue */}
      {mentions.clients?.map((client) => (
        <Badge
          key={`client-${client.id}`}
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 cursor-pointer"
          onClick={() => onMentionClick?.("client", client.id)}
        >
          <Users className="h-3 w-3 mr-1" />
          {client.name}
        </Badge>
      ))}

      {/* Properties - Green */}
      {mentions.properties?.map((property) => (
        <Badge
          key={`property-${property.id}`}
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-800 cursor-pointer"
          onClick={() => onMentionClick?.("property", property.id)}
        >
          <Home className="h-3 w-3 mr-1" />
          {property.name}
        </Badge>
      ))}

      {/* Events - Purple */}
      {mentions.events?.map((event) => (
        <Badge
          key={`event-${event.id}`}
          variant="outline"
          className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 cursor-pointer"
          onClick={() => onMentionClick?.("event", event.id)}
        >
          <Calendar className="h-3 w-3 mr-1" />
          {event.title}
        </Badge>
      ))}

      {/* Tasks - Orange */}
      {mentions.tasks?.map((task) => (
        <Badge
          key={`task-${task.id}`}
          variant="outline"
          className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 cursor-pointer"
          onClick={() => onMentionClick?.("task", task.id)}
        >
          <CheckSquare className="h-3 w-3 mr-1" />
          {task.title}
        </Badge>
      ))}
    </div>
  );
}

