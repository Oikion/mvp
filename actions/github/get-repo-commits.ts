import axios, { AxiosResponse } from "axios";
import build from "@/buildCount.json";

export default async function getAllCommits(): Promise<number> {
  const perPage = 100;
  const buildCount = build.build;
  
  // Return build count directly - GitHub API calls are commented out anyway
  return buildCount;
  
  // Code below is currently disabled but kept for reference
  /* 
  try {
    let commitsCount = 0;
    let page = 1;
    let totalCommits: any[] = [];

    while (true) {
      const response: AxiosResponse<any> = await axios.get(
        process.env.NEXT_PUBLIC_GITHUB_REPO_URL + "/commits",
        {
          headers: {
            Authorization: `token ${process.env.NEXT_PUBLIC_GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
          },
          params: {
            per_page: perPage,
            page: page,
            sha: process.env.NEXT_PUBLIC_GITHUB_COMMIT_SHA,
          },
        }
      );

      const commitsOnPage = response.data;
      if (commitsOnPage.length === 0) {
        break; // No more commits
      }

      totalCommits = totalCommits.concat(commitsOnPage);
      commitsCount += commitsOnPage.length;
      page++;
    }

    return commitsCount || buildCount;
  } catch (error) {
    return buildCount;
  }
  */
}
