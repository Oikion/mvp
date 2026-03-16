"use server"

import resendHelper from "@/lib/resend"
import { cacheGet, cacheSet } from "@/lib/redis"
import type { CommunicationAudience } from "@/lib/communication/types"

const CACHE_KEY = "comm:audiences"
const CACHE_TTL = 300 // 5 minutes

export async function getAudiences(): Promise<CommunicationAudience[]> {
  try {
    // Check cache first
    const cached = await cacheGet<CommunicationAudience[]>(CACHE_KEY)
    if (cached) return cached

    const resend = await resendHelper()
    const { data, error } = await resend.audiences.list()

    if (error || !data) {
      console.error("[GET_AUDIENCES] Resend error:", error)
      return []
    }

    const audiences: CommunicationAudience[] = data.data.map((a) => ({
      id: a.id,
      name: a.name,
      createdAt: a.created_at,
    }))

    await cacheSet(CACHE_KEY, audiences, CACHE_TTL)
    return audiences
  } catch (error) {
    console.error("[GET_AUDIENCES]", error)
    return []
  }
}
