"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertCircle, Save } from "lucide-react"
import type { CommunicationAudience } from "@/lib/communication/types"

interface CampaignSettingsPanelProps {
  campaign: {
    subject: string
    previewText: string | null
    fromName: string | null
    fromEmail: string | null
    replyTo: string | null
    audienceId: string | null
  }
  audiences: CommunicationAudience[]
  onSave: (data: Partial<{
    subject: string
    previewText: string | null
    fromName: string | null
    fromEmail: string | null
    replyTo: string | null
    audienceId: string | null
  }>) => void
  isSaving: boolean
}

export function CampaignSettingsPanel({
  campaign,
  audiences,
  onSave,
  isSaving,
}: CampaignSettingsPanelProps) {
  const [subject, setSubject] = useState(campaign.subject)
  const [previewText, setPreviewText] = useState(campaign.previewText ?? "")
  const [fromName, setFromName] = useState(campaign.fromName ?? "Oikion")
  const [fromEmail, setFromEmail] = useState(campaign.fromEmail ?? "noreply@mail.oikion.com")
  const [replyTo, setReplyTo] = useState(campaign.replyTo ?? "")
  const [audienceId, setAudienceId] = useState(campaign.audienceId ?? "")

  const showEmailWarning =
    fromEmail.length > 0 && !fromEmail.endsWith("@mail.oikion.com")

  const handleSave = () => {
    onSave({
      subject,
      previewText: previewText || null,
      fromName: fromName || null,
      fromEmail: fromEmail || null,
      replyTo: replyTo || null,
      audienceId: audienceId || null,
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Subject Line</label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Preview Text</label>
        <Input
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          placeholder="Text shown in inbox preview"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">From Name</label>
        <Input
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          placeholder="Oikion"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">From Email</label>
        <Input
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
          placeholder="noreply@mail.oikion.com"
        />
        {showEmailWarning && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600">
            <AlertCircle className="h-3 w-3 shrink-0" />
            Domain is not mail.oikion.com — emails may have delivery issues.
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Reply-to</label>
        <Input
          value={replyTo}
          onChange={(e) => setReplyTo(e.target.value)}
          placeholder="replies@oikion.com"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Audience</label>
        <Select value={audienceId} onValueChange={setAudienceId}>
          <SelectTrigger>
            <SelectValue placeholder="Select an audience" />
          </SelectTrigger>
          <SelectContent>
            {audiences.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        <Save className="mr-2 h-4 w-4" />
        {isSaving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  )
}
