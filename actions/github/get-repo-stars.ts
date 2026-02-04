"use server";

import axios, { AxiosResponse } from "axios";

export default async function getGithubRepoStars(): Promise<number> {
  // Skip API call if token is not configured
  // Note: Using GITHUB_TOKEN (server-side only) instead of NEXT_PUBLIC_GITHUB_TOKEN for security
  if (!process.env.GITHUB_TOKEN) {
    return 0;
  }

  try {
    const response: AxiosResponse<{ stargazers_count?: number }> = await axios.get(
      process.env.GITHUB_REPO_API ||
        "https://api.github.com/repos/Oikion/mvp",
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    const stars = response.data;
    return stars.stargazers_count || 0;
  } catch (error) {
    // Silently fail - GitHub token may be invalid or rate limited
    return 0;
  }
}
