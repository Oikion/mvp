import { NextResponse } from "next/server"
import { verifyAuthToken } from "@/lib/cron-auth"
import { watchStaleJobs } from "@/lib/jobs/submit"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * Vercel Cron endpoint — runs every 15 minutes.
 * Finds RUNNING BackgroundJob records older than 60 minutes and either
 * syncs their status from K8s or force-fails them (if no k8sJobName).
 * Prevents stuck jobs from deadlocking future submissions of the same type.
 *
 * Secured by CRON_SECRET env var (same as other cron routes).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (!verifyAuthToken(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await watchStaleJobs(60)
    console.info("[CRON_JOB_WATCHDOG]", result)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error("[CRON_JOB_WATCHDOG]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
