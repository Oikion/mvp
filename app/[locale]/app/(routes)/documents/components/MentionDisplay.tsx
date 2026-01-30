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
          className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 dark:text-blue-400 cursor-pointer"
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
          className="bg-success/10 text-success border-success/30 hover:bg-success/20 dark:text-green-400 cursor-pointer"
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
          className="bg-purple-500/10 text-purple-600 border-purple-500/30 hover:bg-purple-500/20 dark:text-purple-400 cursor-pointer"
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
          className="bg-warning/10 text-warning border-orange-500/30 hover:bg-warning/20 dark:text-orange-400 cursor-pointer"
          onClick={() => onMentionClick?.("task", task.id)}
        >
          <CheckSquare className="h-3 w-3 mr-1" />
          {task.title}
        </Badge>
      ))}
    </div>
  );
}

