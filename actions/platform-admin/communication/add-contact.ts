"use server"

import resendHelper from "@/lib/resend"
import { cacheDel } from "@/lib/redis"
import { requirePlatformAdmin } from "@/lib/platform-admin"

interface AddContactResult {
  success: boolean
  error?: string
}

export async function addContact(
  audienceId: string,
  email: string,
  firstName?: string,
  lastName?: string
): Promise<AddContactResult> {
  await requirePlatformAdmin()

  try {
    const resend = await resendHelper()

    const { error } = await resend.contacts.create({
      email,
      audienceId,
      firstName,
      lastName,
      unsubscribed: false,
    })

    if (error) {
      // If the contact already exists, resubscribe them
      const message = error.message?.toLowerCase() ?? ""
      if (message.includes("already exists") || message.includes("already_exists")) {
        const { error: updateError } = await resend.contacts.update({
          id: email,
          audienceId,
          unsubscribed: false,
        })

        if (updateError) {
          console.error("[ADD_CONTACT] Update error:", updateError)
          return { success: false, error: updateError.message ?? "Failed to update contact" }
        }
      } else {
        console.error("[ADD_CONTACT] Create error:", error)
        return { success: false, error: error.message ?? "Failed to create contact" }
      }
    }

    // Invalidate relevant caches — use the single (non-paginated) contacts cache key
    await cacheDel("comm:audiences", `comm:audience:${audienceId}:contacts`)

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[ADD_CONTACT]", error)
    return { success: false, error: message }
  }
}
