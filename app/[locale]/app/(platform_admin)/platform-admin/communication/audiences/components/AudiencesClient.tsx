"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, RefreshCw, UserPlus, ChevronDown, ChevronUp } from "lucide-react"
import { format } from "date-fns"
import { CommunicationAudience, CommunicationContact, maskEmail } from "@/lib/communication/types"
import { getAudienceContacts } from "@/actions/platform-admin/communication/get-audience-contacts"
import { addContact } from "@/actions/platform-admin/communication/add-contact"

interface AudiencesClientProps {
  audiences: CommunicationAudience[]
  knownAudienceIds: string[]
}

interface ContactsState {
  contacts: CommunicationContact[]
  total: number
}

export function AudiencesClient({ audiences, knownAudienceIds }: AudiencesClientProps) {
  const router = useRouter()
  const [isRefreshing, startRefreshTransition] = useTransition()

  // Per-audience expanded contacts state
  const [expandedAudienceId, setExpandedAudienceId] = useState<string | null>(null)
  const [contactsMap, setContactsMap] = useState<Record<string, ContactsState>>({})
  const [loadingContactsFor, setLoadingContactsFor] = useState<string | null>(null)

  // Add contact dialog state
  const [addContactAudienceId, setAddContactAudienceId] = useState<string | null>(null)
  const [addEmail, setAddEmail] = useState("")
  const [addFirstName, setAddFirstName] = useState("")
  const [addLastName, setAddLastName] = useState("")
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState(false)
  const [isSubmitting, startSubmitTransition] = useTransition()

  const handleRefresh = () => {
    startRefreshTransition(() => {
      router.refresh()
    })
  }

  const handleToggleContacts = async (audienceId: string) => {
    if (expandedAudienceId === audienceId) {
      setExpandedAudienceId(null)
      return
    }

    setExpandedAudienceId(audienceId)

    // If contacts are already loaded, no need to fetch again
    if (contactsMap[audienceId]) return

    setLoadingContactsFor(audienceId)
    try {
      const result = await getAudienceContacts(audienceId)
      setContactsMap((prev) => ({ ...prev, [audienceId]: result }))
    } finally {
      setLoadingContactsFor(null)
    }
  }

  const handleOpenAddDialog = (audienceId: string) => {
    setAddContactAudienceId(audienceId)
    setAddEmail("")
    setAddFirstName("")
    setAddLastName("")
    setAddError(null)
    setAddSuccess(false)
  }

  const handleCloseAddDialog = () => {
    setAddContactAudienceId(null)
    setAddError(null)
    setAddSuccess(false)
  }

  const handleAddContact = () => {
    if (!addContactAudienceId) return

    const audienceId = addContactAudienceId
    setAddError(null)

    startSubmitTransition(async () => {
      const result = await addContact(
        audienceId,
        addEmail.trim(),
        addFirstName.trim() || undefined,
        addLastName.trim() || undefined
      )

      if (!result.success) {
        setAddError(result.error ?? "Failed to add contact.")
        return
      }

      setAddSuccess(true)

      // Invalidate cached contacts for this audience so next expand re-fetches
      setContactsMap((prev) => {
        const updated = { ...prev }
        delete updated[audienceId]
        return updated
      })

      // Close dialog and refresh server data after a brief moment
      setTimeout(() => {
        handleCloseAddDialog()
        router.refresh()
      }, 800)
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Communication</p>
          <h1 className="text-h1 flex items-center gap-3">
            <Users className="h-7 w-7 text-primary" />
            Audiences
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Empty State */}
      {audiences.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-body font-medium mb-1">No audiences found</p>
            <p className="text-caption text-muted-foreground">
              Configure your Resend API key in Settings.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Audience Cards */}
      {audiences.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {audiences.map((audience) => {
            const isKnown = knownAudienceIds.includes(audience.id)
            const isExpanded = expandedAudienceId === audience.id
            const isLoadingContacts = loadingContactsFor === audience.id
            const audienceContacts = contactsMap[audience.id]

            return (
              <Card key={audience.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {audience.name}
                    </CardTitle>
                    {isKnown && (
                      <Badge className="shrink-0 text-xs bg-primary/10 text-primary hover:bg-primary/20">
                        System Audience
                      </Badge>
                    )}
                  </div>
                  <p className="text-caption text-muted-foreground font-mono break-all">
                    {audience.id}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    Created {format(new Date(audience.createdAt), "MMM d, yyyy")}
                  </p>
                </CardHeader>

                <CardContent className="pt-0 flex flex-col gap-2 flex-1">
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenAddDialog(audience.id)}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                      Add Contact
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleToggleContacts(audience.id)}
                      disabled={isLoadingContacts}
                    >
                      {isLoadingContacts ? (
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {isExpanded ? "Hide Contacts" : "View Contacts"}
                    </Button>
                  </div>

                  {/* Inline Contacts Table */}
                  {isExpanded && (
                    <div className="mt-2 border rounded-md overflow-hidden">
                      {isLoadingContacts ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-caption">Loading contacts…</span>
                        </div>
                      ) : audienceContacts && audienceContacts.contacts.length > 0 ? (
                        <>
                          <div className="px-3 py-2 bg-muted/40 border-b flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-caption text-muted-foreground">
                              {audienceContacts.total} contact{audienceContacts.total !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="overflow-x-auto max-h-64 overflow-y-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Email</TableHead>
                                  <TableHead className="text-xs">Name</TableHead>
                                  <TableHead className="text-xs">Status</TableHead>
                                  <TableHead className="text-xs">Added</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {audienceContacts.contacts.map((contact) => (
                                  <TableRow key={contact.id}>
                                    <TableCell className="text-xs font-medium font-mono">
                                      {maskEmail(contact.email)}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {contact.firstName || contact.lastName
                                        ? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim()
                                        : <span className="text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {contact.unsubscribed ? (
                                        <Badge className="text-xs bg-muted text-muted-foreground hover:bg-muted">
                                          Unsubscribed
                                        </Badge>
                                      ) : (
                                        <Badge className="text-xs bg-success/10 text-success hover:bg-success/20">
                                          Subscribed
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {format(new Date(contact.createdAt), "MMM d, yyyy")}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <Users className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-caption text-muted-foreground">No contacts in this audience</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Contact Dialog */}
      <Dialog open={!!addContactAudienceId} onOpenChange={(open) => { if (!open) handleCloseAddDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>
              Add a new contact to this audience. If the contact already exists, they will be resubscribed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-email"
                type="email"
                placeholder="contact@example.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                disabled={isSubmitting || addSuccess}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-first-name">First Name</Label>
                <Input
                  id="add-first-name"
                  placeholder="Jane"
                  value={addFirstName}
                  onChange={(e) => setAddFirstName(e.target.value)}
                  disabled={isSubmitting || addSuccess}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-last-name">Last Name</Label>
                <Input
                  id="add-last-name"
                  placeholder="Doe"
                  value={addLastName}
                  onChange={(e) => setAddLastName(e.target.value)}
                  disabled={isSubmitting || addSuccess}
                />
              </div>
            </div>

            {addError && (
              <p className="text-sm text-destructive">{addError}</p>
            )}

            {addSuccess && (
              <p className="text-sm text-success">Contact added successfully.</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleCloseAddDialog}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddContact}
                disabled={!addEmail.trim() || isSubmitting || addSuccess}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Adding…
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                    Add Contact
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
