"use server"

import resendHelper from "@/lib/resend"
import { cacheGet, cacheSet } from "@/lib/redis"
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
  const cacheKey = `comm:audience:${audienceId}:contacts:${page}`

  try {
    // Check cache first
    const cached = await cacheGet<GetAudienceContactsResult>(cacheKey)
    if (cached) return cached

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

    // Cap at PAGE_SIZE per page
    const offset = (page - 1) * PAGE_SIZE
    const contacts = allContacts.slice(offset, offset + PAGE_SIZE)
    const result: GetAudienceContactsResult = {
      contacts,
      total: allContacts.length,
    }

    await cacheSet(cacheKey, result, CACHE_TTL)
    return result
  } catch (error) {
    console.error("[GET_AUDIENCE_CONTACTS]", error)
    return { contacts: [], total: 0 }
  }
}
