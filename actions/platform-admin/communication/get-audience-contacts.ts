"use server"

import resendHelper from "@/lib/resend"
import { cacheGet, cacheSet } from "@/lib/redis"
import { requirePlatformAdmin } from "@/lib/platform-admin"
import type { CommunicationContact } from "@/lib/communication/types"

const CACHE_TTL = 120 // 2 minutes
const PAGE_SIZE = 500

interface GetAudienceContactsResult {
  contacts: CommunicationContact[]
  total: number
}

export async function getAudienceContacts(
  audienceId: string,
  page: number = 1
): Promise<GetAudienceContactsResult> {
  await requirePlatformAdmin()

  // Single cache key for the full contact list — slicing is done client-side
  const cacheKey = `comm:audience:${audienceId}:contacts`

  try {
    // Check cache first — cache stores the full contact array
    const cachedAll = await cacheGet<CommunicationContact[]>(cacheKey)
    if (cachedAll) {
      const offset = (page - 1) * PAGE_SIZE
      return { contacts: cachedAll.slice(offset, offset + PAGE_SIZE), total: cachedAll.length }
    }

    const resend = await resendHelper()
    const { data, error } = await resend.contacts.list({ audienceId })

    if (error || !data) {
      console.error("[GET_AUDIENCE_CONTACTS] Resend error:", error)
      return { contacts: [], total: 0 }
    }

    const allContacts: CommunicationContact[] = data.data.map((c) => ({
      id: c.id,
      email: c.email,
      firstName: c.first_name ?? null,
      lastName: c.last_name ?? null,
      unsubscribed: c.unsubscribed,
      createdAt: c.created_at,
    }))

    // Cache the full array; slice for the requested page before returning
    await cacheSet(cacheKey, allContacts, CACHE_TTL)
    const offset = (page - 1) * PAGE_SIZE
    return { contacts: allContacts.slice(offset, offset + PAGE_SIZE), total: allContacts.length }
  } catch (error) {
    console.error("[GET_AUDIENCE_CONTACTS]", error)
    return { contacts: [], total: 0 }
  }
}
