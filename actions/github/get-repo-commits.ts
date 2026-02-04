"use server";

import build from "@/buildCount.json";

export default async function getAllCommits(): Promise<number> {
  // Return build count directly - GitHub API calls are disabled for simplicity
  // Note: If re-enabling, use GITHUB_TOKEN (server-side only) instead of NEXT_PUBLIC_GITHUB_TOKEN
  return build.build;
}
