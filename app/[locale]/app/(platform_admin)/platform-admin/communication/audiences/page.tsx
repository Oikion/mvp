import { getAudiences } from "@/actions/platform-admin/communication/get-audiences"
import { AudiencesClient } from "./components/AudiencesClient"
import { RESEND_SEGMENTS } from "@/lib/resend-segments"

export default async function AudiencesPage() {
  const audiences = await getAudiences()
  const knownAudienceIds = Object.values(RESEND_SEGMENTS)
  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        <AudiencesClient audiences={audiences} knownAudienceIds={knownAudienceIds} />
      </div>
    </div>
  )
}
