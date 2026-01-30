"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Hash, MessageCircle, Users, Loader2, X } from "lucide-react";
import { searchMessages } from "@/actions/messaging";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MessageSearchProps {
  locale: string;
  children?: React.ReactNode;
}

interface SearchResult {
  topic: string;
  topicName?: string;
  topicType: "channel" | "dm" | "entity";
  messages: Array<{
    seq: number;
    from: string;
    fromName?: string;
    content: string;
    ts: string;
    highlight?: string;
  }>;
}

export function MessageSearch({ locale, children }: MessageSearchProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const debouncedQuery = useDebounce(query, 300);

  // Perform search when debounced query changes
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      setTotalCount(0);
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchMessages({
        query: searchQuery,
        limit: 50,
      });

      if (response.success && response.results) {
        setResults(response.results);
        setTotalCount(response.totalCount || 0);
      } else {
        setResults([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Effect to search on debounced query change
  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  const handleResultClick = (topic: string, seq?: number) => {
    setOpen(false);
    // Navigate to the conversation, optionally with message seq for scrolling
    const url = `/${locale}/app/messages?topic=${topic}${seq ? `&msg=${seq}` : ""}`;
    router.push(url);
  };

  const getTopicIcon = (type: "channel" | "dm" | "entity") => {
    switch (type) {
      case "channel":
        return <Hash className="h-4 w-4" />;
      case "dm":
        return <MessageCircle className="h-4 w-4" />;
      case "entity":
        return <Users className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Search Messages</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                performSearch(e.target.value);
              }}
              placeholder="Search messages..."
              className="pl-9 pr-9"
              autoFocus
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results */}
          <ScrollArea className="flex-1 min-h-0">
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : query.length < 2 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No messages found for &quot;{query}&quot;
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Found {totalCount} message{totalCount !== 1 ? "s" : ""} in {results.length} conversation{results.length !== 1 ? "s" : ""}
                </p>

                {results.map((result) => (
                  <div key={result.topic} className="space-y-2">
                    {/* Topic header */}
                    <button
                      onClick={() => handleResultClick(result.topic)}
                      className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                    >
                      {getTopicIcon(result.topicType)}
                      <span>
                        {result.topicType === "channel" && "#"}
                        {result.topicName || result.topic}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {result.messages.length}
                      </Badge>
                    </button>

                    {/* Messages */}
                    <div className="pl-6 space-y-2">
                      {result.messages.slice(0, 3).map((msg) => (
                        <button
                          key={msg.seq}
                          onClick={() => handleResultClick(result.topic, msg.seq)}
                          className={cn(
                            "w-full text-left p-2 rounded-lg border",
                            "hover:bg-accent/50 transition-colors"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">
                              {msg.fromName || msg.from}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(msg.ts), "MMM d, HH:mm")}
                            </span>
                          </div>
                          {msg.highlight ? (
                            <p
                              className="text-sm text-muted-foreground line-clamp-2"
                              dangerouslySetInnerHTML={{ __html: msg.highlight }}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {msg.content}
                            </p>
                          )}
                        </button>
                      ))}
                      {result.messages.length > 3 && (
                        <button
                          onClick={() => handleResultClick(result.topic)}
                          className="text-xs text-primary hover:underline"
                        >
                          +{result.messages.length - 3} more messages
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
