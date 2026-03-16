"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Send, Eye, Code, Settings, AlertCircle, Save } from "lucide-react"
import { BlockPalette } from "./BlockPalette"
import { BlockCanvas } from "./BlockCanvas"
import { CampaignSettingsPanel } from "./CampaignSettingsPanel"
import { HtmlPreviewPanel } from "./HtmlPreviewPanel"
import { updateCampaign } from "@/actions/platform-admin/communication/update-campaign"
import { renderCampaignBlocks } from "@/actions/platform-admin/communication/render-campaign-blocks"
import { sendCampaign } from "@/actions/platform-admin/communication/send-campaign"
import { sendTestEmail } from "@/actions/platform-admin/communication/send-test-email"
import type { EmailBlock, CommunicationAudience } from "@/lib/communication/types"
import { generateBlockId } from "@/lib/communication/types"
import { toast } from "sonner"

interface CampaignEditorProps {
  campaign: {
    id: string
    subject: string
    previewText: string | null
    content: string
    fromName: string | null
    fromEmail: string | null
    replyTo: string | null
    status: string
    audienceId: string | null
    blocks: EmailBlock[]
  }
  audiences: CommunicationAudience[]
}

export function CampaignEditor({ campaign, audiences }: CampaignEditorProps) {
  const [blocks, setBlocks] = useState<EmailBlock[]>(campaign.blocks)
  const [isSaving, setIsSaving] = useState(false)
  const [previewHtml, setPreviewHtml] = useState("")
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [activeRightTab, setActiveRightTab] = useState<string>("preview")
  const [subject, setSubject] = useState(campaign.subject)
  const [testEmail, setTestEmail] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [campaignSettings, setCampaignSettings] = useState({
    subject: campaign.subject,
    previewText: campaign.previewText,
    fromName: campaign.fromName,
    fromEmail: campaign.fromEmail,
    replyTo: campaign.replyTo,
    audienceId: campaign.audienceId,
  })

  const isReadOnly = campaign.status === "SENT" || campaign.status === "SENDING"

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save blocks on change
  useEffect(() => {
    if (isReadOnly) return

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      setIsSaving(true)
      try {
        await updateCampaign(campaign.id, {
          blocks,
          content: previewHtml || campaign.content,
        })
      } catch (error) {
        console.error("Auto-save failed:", error)
        toast.error("Failed to save changes")
      } finally {
        setIsSaving(false)
      }
    }, 1000)

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [blocks]) // eslint-disable-line react-hooks/exhaustive-deps

  // Render preview on block changes
  useEffect(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current)
    }

    previewTimerRef.current = setTimeout(async () => {
      if (blocks.length === 0) {
        setPreviewHtml("")
        return
      }
      setIsPreviewLoading(true)
      try {
        const result = await renderCampaignBlocks(
          blocks,
          campaignSettings.previewText ?? undefined
        )
        if (result.html) {
          setPreviewHtml(result.html)
        }
      } catch (error) {
        console.error("Preview render failed:", error)
      } finally {
        setIsPreviewLoading(false)
      }
    }, 500)

    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    }
  }, [blocks, campaignSettings.previewText])

  const handleAddBlock = useCallback(
    (type: EmailBlock["type"]) => {
      if (isReadOnly) return

      let newBlock: EmailBlock

      switch (type) {
        case "header":
          newBlock = { id: generateBlockId(), type: "header", props: { title: "Heading" } }
          break
        case "text":
          newBlock = { id: generateBlockId(), type: "text", props: { content: "Your text here..." } }
          break
        case "button":
          newBlock = { id: generateBlockId(), type: "button", props: { text: "Click here", href: "https://" } }
          break
        case "card":
          newBlock = { id: generateBlockId(), type: "card", props: { title: "Card Title", items: ["Item 1"] } }
          break
        case "divider":
          newBlock = { id: generateBlockId(), type: "divider", props: {} as Record<string, never> }
          break
        case "badge":
          newBlock = { id: generateBlockId(), type: "badge", props: { text: "Badge", color: "blue" } }
          break
        case "image":
          newBlock = { id: generateBlockId(), type: "image", props: { src: "", alt: "Image" } }
          break
        default:
          return
      }

      setBlocks((prev) => [...prev, newBlock])
    },
    [isReadOnly]
  )

  const handleDeleteBlock = useCallback(
    (id: string) => {
      if (isReadOnly) return
      setBlocks((prev) => prev.filter((b) => b.id !== id))
    },
    [isReadOnly]
  )

  const handleSettingsSave = useCallback(
    async (data: Partial<typeof campaignSettings>) => {
      setIsSaving(true)
      try {
        const updated = { ...campaignSettings, ...data }
        setCampaignSettings(updated)

        if (data.subject !== undefined) {
          setSubject(data.subject)
        }

        await updateCampaign(campaign.id, {
          ...(data.subject !== undefined && { subject: data.subject }),
          ...(data.previewText !== undefined && { previewText: data.previewText ?? undefined }),
          ...(data.fromName !== undefined && { fromName: data.fromName ?? undefined }),
          ...(data.fromEmail !== undefined && { fromEmail: data.fromEmail ?? undefined }),
          ...(data.replyTo !== undefined && { replyTo: data.replyTo ?? undefined }),
          ...(data.audienceId !== undefined && { audienceId: data.audienceId ?? undefined }),
        })
        toast.success("Settings saved")
      } catch (error) {
        console.error("Settings save failed:", error)
        toast.error("Failed to save settings")
      } finally {
        setIsSaving(false)
      }
    },
    [campaign.id, campaignSettings]
  )

  const handleSendCampaign = useCallback(async () => {
    if (!campaignSettings.audienceId) return
    setIsSending(true)
    try {
      const result = await sendCampaign(campaign.id)
      if (result.success) {
        toast.success(`Campaign sent to ${result.sentCount} recipients`)
        setSendDialogOpen(false)
      } else {
        toast.error(result.error ?? "Failed to send campaign")
      }
    } catch (error) {
      console.error("Send failed:", error)
      toast.error("Failed to send campaign")
    } finally {
      setIsSending(false)
    }
  }, [campaign.id, campaignSettings.audienceId])

  const handleSendTest = useCallback(async () => {
    if (!testEmail) return
    setIsSendingTest(true)
    try {
      const result = await sendTestEmail(campaign.id, testEmail)
      if (result.success) {
        toast.success(`Test email sent to ${testEmail}`)
        setTestDialogOpen(false)
      } else {
        toast.error(result.error ?? "Failed to send test email")
      }
    } catch (error) {
      console.error("Test send failed:", error)
      toast.error("Failed to send test email")
    } finally {
      setIsSendingTest(false)
    }
  }, [campaign.id, testEmail])

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Read-only banner */}
      {isReadOnly && (
        <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4" />
          This campaign has been sent and cannot be edited.
        </div>
      )}

      {/* Top toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Input
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value)
              handleSettingsSave({ subject: e.target.value })
            }}
            className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 w-[400px] px-0"
            placeholder="Campaign subject..."
            readOnly={isReadOnly}
          />
          {isSaving && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Save className="h-3 w-3 animate-pulse" />
              Saving...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Send Test dialog */}
          <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isReadOnly}>
                Send Test
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Test Email</DialogTitle>
                <DialogDescription>
                  Send a preview of this campaign to a test email address.
                </DialogDescription>
              </DialogHeader>
              <Input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <DialogFooter>
                <Button
                  onClick={handleSendTest}
                  disabled={!testEmail || isSendingTest}
                >
                  {isSendingTest ? "Sending..." : "Send Test"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Send Campaign dialog */}
          <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={isReadOnly}>
                <Send className="mr-2 h-4 w-4" />
                Send Campaign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Campaign</DialogTitle>
                <DialogDescription>
                  {campaignSettings.audienceId
                    ? "Are you sure you want to send this campaign? This action cannot be undone."
                    : "You need to select an audience in the Settings tab before sending."}
                </DialogDescription>
              </DialogHeader>
              {!campaignSettings.audienceId ? (
                <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Select an audience in Settings first.
                </div>
              ) : (
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleSendCampaign}
                    disabled={isSending}
                  >
                    {isSending ? "Sending..." : "Confirm Send"}
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Split pane layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left pane — Block editor */}
        <div className="flex w-2/3 flex-col border-r overflow-auto">
          {!isReadOnly && (
            <div className="border-b px-4 py-3">
              <BlockPalette onAddBlock={handleAddBlock} />
            </div>
          )}
          <div className="flex-1 overflow-auto p-4">
            <BlockCanvas
              blocks={blocks}
              onChange={setBlocks}
              onDelete={handleDeleteBlock}
              readOnly={isReadOnly}
            />
          </div>
        </div>

        {/* Right pane — Tabbed panel */}
        <div className="flex w-1/3 flex-col overflow-hidden">
          <Tabs
            value={activeRightTab}
            onValueChange={setActiveRightTab}
            className="flex flex-1 flex-col"
          >
            <TabsList className="mx-4 mt-3 grid w-auto grid-cols-3">
              <TabsTrigger value="preview" className="gap-1">
                <Eye className="h-3.5 w-3.5" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="html" className="gap-1">
                <Code className="h-3.5 w-3.5" />
                HTML
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1">
                <Settings className="h-3.5 w-3.5" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="flex-1 overflow-auto p-4">
              {previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  className="h-full w-full rounded border"
                  title="Email Preview"
                  sandbox=""
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {isPreviewLoading
                    ? "Rendering preview..."
                    : "Add blocks to see a preview"}
                </div>
              )}
            </TabsContent>

            <TabsContent value="html" className="flex-1 overflow-auto p-4">
              <HtmlPreviewPanel html={previewHtml} isLoading={isPreviewLoading} />
            </TabsContent>

            <TabsContent value="settings" className="flex-1 overflow-auto p-4">
              <CampaignSettingsPanel
                campaign={campaignSettings}
                audiences={audiences}
                onSave={handleSettingsSave}
                isSaving={isSaving}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
