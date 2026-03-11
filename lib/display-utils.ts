type UserLike =
  | { name?: string | null; email?: string | null; avatar?: string | null }
  | null
  | undefined;

type UserDisplay = {
  name: string;
  email: string;
  avatar: string | null;
  isDeleted: boolean;
};

const DELETED_USER_FALLBACK = "Deleted User";

/**
 * Safely extract display fields from a user reference that may be null
 * (e.g. after user departure sets the FK to null via onDelete: SetNull).
 *
 * Usage in components:
 * ```tsx
 * const display = getUserDisplay(post.author);
 * <span>{display.isDeleted ? t("common.deletedUser") : display.name}</span>
 * ```
 */
export function getUserDisplay(user: UserLike): UserDisplay {
  if (!user) {
    return {
      name: DELETED_USER_FALLBACK,
      email: "",
      avatar: null,
      isDeleted: true,
    };
  }
  return {
    name: user.name || user.email || DELETED_USER_FALLBACK,
    email: user.email || "",
    avatar: user.avatar || null,
    isDeleted: false,
  };
}
