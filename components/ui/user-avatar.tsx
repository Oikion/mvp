"use client";

import * as React from "react";
import { User, Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * UserAvatar - Standardized avatar component with consistent fallbacks
 *
 * Features:
 * - Automatic initials generation from name
 * - Consistent fallback icon when no name/image
 * - Multiple size variants
 * - Error handling for failed image loads
 * - Optional status indicator
 * - Accessible with proper ARIA attributes
 *
 * @example
 * ```tsx
 * // With image
 * <UserAvatar
 *   name="John Smith"
 *   imageUrl="/avatars/john.jpg"
 *   size="md"
 * />
 *
 * // Without image (shows initials)
 * <UserAvatar name="John Smith" />
 *
 * // Without name (shows icon)
 * <UserAvatar />
 *
 * // With status indicator
 * <UserAvatar name="John Smith" status="online" />
 * ```
 */

const avatarVariants = cva("", {
  variants: {
    size: {
      xs: "h-6 w-6 text-[10px]",
      sm: "h-8 w-8 text-xs",
      md: "h-10 w-10 text-sm",
      lg: "h-12 w-12 text-base",
      xl: "h-16 w-16 text-lg",
      "2xl": "h-24 w-24 text-xl",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const statusVariants = cva(
  "absolute rounded-full border-2 border-background",
  {
    variants: {
      status: {
        online: "bg-success",
        offline: "bg-muted-foreground",
        busy: "bg-destructive",
        away: "bg-warning",
      },
      size: {
        xs: "h-2 w-2 -right-0.5 -bottom-0.5",
        sm: "h-2.5 w-2.5 -right-0.5 -bottom-0.5",
        md: "h-3 w-3 -right-0.5 -bottom-0.5",
        lg: "h-3.5 w-3.5 -right-0.5 -bottom-0.5",
        xl: "h-4 w-4 -right-0.5 -bottom-0.5",
        "2xl": "h-5 w-5 right-0 bottom-0",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export interface UserAvatarProps extends VariantProps<typeof avatarVariants> {
  /**
   * Full name for generating initials
   */
  name?: string | null;
  /**
   * URL of the avatar image
   */
  imageUrl?: string | null;
  /**
   * Whether this is an organization avatar (shows building icon instead of user icon)
   */
  isOrganization?: boolean;
  /**
   * Optional status indicator
   */
  status?: "online" | "offline" | "busy" | "away";
  /**
   * Additional class name
   */
  className?: string;
  /**
   * Class name for the fallback
   */
  fallbackClassName?: string;
  /**
   * Callback when image fails to load
   */
  onImageError?: () => void;
}

/**
 * Get initials from a name string
 *
 * @param name - Full name
 * @param maxLength - Maximum number of initials (default: 2)
 * @returns Uppercase initials
 *
 * @example
 * getInitials("John Smith") // "JS"
 * getInitials("John") // "J"
 * getInitials("John William Smith") // "JS"
 * getInitials("") // ""
 */
export function getInitials(name: string | null | undefined, maxLength = 2): string {
  if (!name) return "";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  // Take first and last name initials
  return parts
    .slice(0, maxLength)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export function UserAvatar({
  name,
  imageUrl,
  isOrganization = false,
  status,
  size = "md",
  className,
  fallbackClassName,
  onImageError,
}: Readonly<UserAvatarProps>) {
  const [imageError, setImageError] = React.useState(false);
  const initials = getInitials(name);

  // Reset error state when imageUrl changes
  React.useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  const handleImageError = React.useCallback(() => {
    setImageError(true);
    onImageError?.();
  }, [onImageError]);

  const showImage = imageUrl && !imageError;
  const FallbackIcon = isOrganization ? Building2 : User;

  return (
    <div className="relative inline-flex">
      <Avatar
        className={cn(avatarVariants({ size }), className)}
        aria-label={name ?? (isOrganization ? "Organization" : "User")}
      >
        {showImage && (
          <AvatarImage
            src={imageUrl}
            alt={name ?? ""}
            onError={handleImageError}
          />
        )}
        <AvatarFallback
          className={cn(
            "bg-muted text-muted-foreground",
            fallbackClassName
          )}
          delayMs={showImage ? 600 : 0}
        >
          {initials || (
            <FallbackIcon
              className={cn(
                size === "xs" && "h-3 w-3",
                size === "sm" && "h-4 w-4",
                size === "md" && "h-5 w-5",
                size === "lg" && "h-6 w-6",
                size === "xl" && "h-8 w-8",
                size === "2xl" && "h-10 w-10"
              )}
            />
          )}
        </AvatarFallback>
      </Avatar>
      {status && (
        <span
          className={cn(statusVariants({ status, size }))}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}

/**
 * UserAvatarGroup - Display multiple avatars in a stacked group
 *
 * @example
 * ```tsx
 * <UserAvatarGroup
 *   users={[
 *     { name: "John", imageUrl: "/john.jpg" },
 *     { name: "Jane", imageUrl: "/jane.jpg" },
 *     { name: "Bob" },
 *   ]}
 *   max={3}
 * />
 * ```
 */

export interface AvatarUser {
  name?: string | null;
  imageUrl?: string | null;
}

export interface UserAvatarGroupProps extends VariantProps<typeof avatarVariants> {
  /**
   * Array of users to display
   */
  users: AvatarUser[];
  /**
   * Maximum number of avatars to show before +N
   */
  max?: number;
  /**
   * Additional class name for the container
   */
  className?: string;
}

export function UserAvatarGroup({
  users,
  max = 4,
  size = "sm",
  className,
}: Readonly<UserAvatarGroupProps>) {
  const displayUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  return (
    <div className={cn("flex -space-x-2", className)}>
      {displayUsers.map((user, index) => (
        <UserAvatar
          key={index}
          name={user.name}
          imageUrl={user.imageUrl}
          size={size}
          className="ring-2 ring-background"
        />
      ))}
      {remainingCount > 0 && (
        <Avatar
          className={cn(
            avatarVariants({ size }),
            "ring-2 ring-background bg-muted"
          )}
        >
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            +{remainingCount}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

/**
 * Default avatar fallback image URL
 */
export const DEFAULT_AVATAR_URL = "/images/nouser.png";

/**
 * Default organization avatar fallback image URL
 */
export const DEFAULT_ORG_AVATAR_URL = "/images/organization-default.png";
