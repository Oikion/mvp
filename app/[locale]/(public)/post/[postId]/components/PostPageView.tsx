"use client";

import { formatDistanceToNow } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Heart,
  MessageCircle,
  Building2,
  User,
  FileText,
  Globe,
  Lock,
  Shield,
  ArrowLeft,
  LogIn,
} from "lucide-react";
import Link from "next/link";
import type { PostWithAuthor } from "@/actions/social-feed/get-post-by-id";

interface PostPageViewProps {
  post: PostWithAuthor;
  locale: string;
}

export function PostPageView({ post, locale }: PostPageViewProps) {
  const dateLocale = locale === "el" ? el : enUS;

  const getPostIcon = (type: string) => {
    switch (type) {
      case "property":
        return <Building2 className="h-4 w-4" />;
      case "client":
        return <User className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getPostColor = (type: string) => {
    switch (type) {
      case "property":
        return "bg-primary/10 text-primary border-primary/20";
      case "client":
        return "bg-success/10 text-success border-success/20";
      default:
        return "bg-gray-500/10 text-muted-foreground border-gray-500/20";
    }
  };

  const getVisibilityBadge = () => {
    switch (post.author.visibility) {
      case "PUBLIC":
        return (
          <Badge
            variant="outline"
            className="text-xs bg-success/10 text-success border-success/20"
          >
            <Globe className="h-3 w-3 mr-1" />
            Public
          </Badge>
        );
      case "SECURE":
        return (
          <Badge
            variant="outline"
            className="text-xs bg-warning/10 text-warning border-warning/20"
          >
            <Shield className="h-3 w-3 mr-1" />
            Secure
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="text-xs bg-destructive/10 text-destructive border-destructive/20"
          >
            <Lock className="h-3 w-3 mr-1" />
            Private
          </Badge>
        );
    }
  };

  const getEntityLink = () => {
    if (!post.linkedEntity) return "#";
    switch (post.linkedEntity.type) {
      case "property":
        return `/property/${post.linkedEntity.id}`;
      default:
        return "#";
    }
  };

  // Render access denied view
  if (!post.isAccessible) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <div className="max-w-2xl mx-auto px-4 py-12">
          {/* Back button */}
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {locale === "el" ? "Αρχική" : "Home"}
            </Link>
          </Button>

          <Card className="overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="rounded-full bg-warning/10 dark:bg-amber-900/30 p-4 mb-4">
                {post.requiresAuth ? (
                  <Lock className="h-8 w-8 text-warning dark:text-amber-400" />
                ) : (
                  <Shield className="h-8 w-8 text-warning dark:text-amber-400" />
                )}
              </div>
              <h1 className="text-xl font-semibold text-foreground dark:text-slate-100 mb-2">
                {locale === "el" ? "Ιδιωτική Δημοσίευση" : "Private Post"}
              </h1>
              <p className="text-muted-foreground dark:text-muted-foreground mb-6 max-w-md">
                {post.author.visibility === "PERSONAL"
                  ? locale === "el"
                    ? "Αυτή η δημοσίευση είναι μόνο για τις συνδέσεις του χρήστη."
                    : "This post is only visible to the author's connections."
                  : locale === "el"
                  ? "Συνδεθείτε για να δείτε αυτή τη δημοσίευση."
                  : "Please sign in to view this post."}
              </p>
              {post.requiresAuth && (
                <Button asChild>
                  <Link href="/sign-in">
                    <LogIn className="h-4 w-4 mr-2" />
                    {locale === "el" ? "Σύνδεση" : "Sign In"}
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {locale === "el" ? "Αρχική" : "Home"}
          </Link>
        </Button>

        {/* Post Card */}
        <Card className="overflow-hidden shadow-lg">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Link
                  href={
                    post.author.username
                      ? `/agent/${post.author.username}`
                      : "#"
                  }
                  className="hover:opacity-80 transition-opacity"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={post.author.avatar || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">
                      {post.author.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={
                        post.author.username
                          ? `/agent/${post.author.username}`
                          : "#"
                      }
                      className="font-semibold text-foreground dark:text-slate-100 hover:text-primary dark:hover:text-blue-400 transition-colors"
                    >
                      {post.author.name}
                    </Link>
                    {getVisibilityBadge()}
                  </div>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    {formatDistanceToNow(new Date(post.timestamp), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Post Content */}
            {post.content && (
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-base leading-relaxed">
                {post.content}
              </p>
            )}

            {/* Attachments */}
            {post.attachments && post.attachments.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {post.attachments
                  .filter((a) => a.fileType.startsWith("image/"))
                  .map((attachment) => (
                    <img
                      key={attachment.id}
                      src={attachment.url}
                      alt={attachment.fileName}
                      className="rounded-lg w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(attachment.url, "_blank")}
                    />
                  ))}
              </div>
            )}

            {/* Linked Entity Card */}
            {post.linkedEntity && (
              <Link href={getEntityLink()}>
                <div className="border rounded-xl p-4 hover:bg-muted dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div
                      className={`rounded-full p-2.5 ${getPostColor(
                        post.linkedEntity.type
                      )}`}
                    >
                      {getPostIcon(post.linkedEntity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {post.linkedEntity.type === "property"
                            ? locale === "el"
                              ? "Ακίνητο"
                              : "Property"
                            : locale === "el"
                            ? "Πελάτης"
                            : "Client"}
                        </Badge>
                      </div>
                      <h4 className="font-semibold mt-1 truncate text-foreground dark:text-slate-100">
                        {post.linkedEntity.title}
                      </h4>
                      {post.linkedEntity.subtitle && (
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground truncate">
                          {post.linkedEntity.subtitle}
                        </p>
                      )}
                      {post.linkedEntity.metadata?.price && (
                        <p className="text-lg font-bold text-primary dark:text-blue-400 mt-2">
                          €{post.linkedEntity.metadata.price.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Stats Bar */}
            <div className="flex items-center gap-6 pt-4 border-t text-muted-foreground dark:text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Heart className="h-4 w-4" />
                <span className="text-sm">
                  {post.likes} {locale === "el" ? "likes" : "likes"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">
                  {post.comments}{" "}
                  {locale === "el" ? "σχόλια" : "comments"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="mt-6 bg-gradient-to-r from-blue-500 to-indigo-600 border-0">
          <CardContent className="py-6 text-center text-white">
            <h3 className="text-lg font-semibold mb-2">
              {locale === "el"
                ? "Ενδιαφέρεστε για αυτή τη δημοσίευση;"
                : "Interested in this post?"}
            </h3>
            <p className="text-blue-100 mb-4 text-sm">
              {locale === "el"
                ? "Συνδεθείτε με τον μεσίτη για περισσότερες πληροφορίες."
                : "Connect with the agent for more information."}
            </p>
            {post.author.username && (
              <Button variant="secondary" asChild>
                <Link href={`/agent/${post.author.username}`}>
                  {locale === "el" ? "Προβολή Προφίλ" : "View Profile"}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="mt-12 text-center">
          <p className="text-muted-foreground text-sm">
            Powered by{" "}
            <span className="text-muted-foreground dark:text-slate-300 font-semibold">
              Oikion
            </span>
          </p>
        </footer>
      </div>
    </div>
  );
}
