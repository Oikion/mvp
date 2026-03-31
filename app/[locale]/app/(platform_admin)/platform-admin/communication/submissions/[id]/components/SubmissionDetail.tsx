'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Mail, Building2, Globe, Clock, CheckCircle2, MessageSquare, User } from 'lucide-react'
import { updateSubmissionStatus } from '@/actions/platform-admin/get-website-submissions'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Submission {
  id: string
  inquiryType: string
  name: string
  email: string
  orgName: string | null
  message: string | null
  locale: string
  status: string
  notes: string | null
  emailSentAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const TYPE_LABELS: Record<string, string> = {
  invest: 'Investor Inquiry',
  partner: 'Partnership Inquiry',
  try: 'Platform Trial Request',
  ask: 'General Question',
}

const STATUS_CONFIG: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  NEW: { variant: 'default', label: 'New' },
  READ: { variant: 'secondary', label: 'Read' },
  CONTACTED: { variant: 'outline', label: 'Contacted' },
  ARCHIVED: { variant: 'destructive', label: 'Archived' },
}

export function SubmissionDetail({ submission, locale }: { submission: Submission; locale: string }) {
  const router = useRouter()
  const [status, setStatus] = useState(submission.status)
  const [notes, setNotes] = useState(submission.notes ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await updateSubmissionStatus(submission.id, status as 'NEW' | 'READ' | 'CONTACTED' | 'ARCHIVED', notes || undefined)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{submission.name}</h1>
          <p className="text-muted-foreground mt-1">
            {TYPE_LABELS[submission.inquiryType] ?? submission.inquiryType}
          </p>
        </div>
        <Badge variant={STATUS_CONFIG[submission.status]?.variant ?? 'secondary'} className="text-sm">
          {STATUS_CONFIG[submission.status]?.label ?? submission.status}
        </Badge>
      </div>

      {/* Contact info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-medium">{submission.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <a href={`mailto:${submission.email}`} className="text-sm font-medium text-primary hover:underline">
                  {submission.email}
                </a>
              </div>
            </div>
            {submission.orgName && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Organisation</p>
                  <p className="text-sm font-medium">{submission.orgName}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Locale</p>
                <p className="text-sm font-medium">{submission.locale.toUpperCase()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message */}
      {submission.message && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Message
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{submission.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted</span>
              <span>{format(new Date(submission.createdAt), 'PPp')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last updated</span>
              <span>{format(new Date(submission.updatedAt), 'PPp')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Confirmation email</span>
              <span className="flex items-center gap-1.5">
                {submission.emailSentAt ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    Sent {format(new Date(submission.emailSentAt), 'PPp')}
                  </>
                ) : (
                  <span className="text-muted-foreground">Not sent</span>
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admin Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="READ">Read</SelectItem>
                <SelectItem value="CONTACTED">Contacted</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Internal Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes about this submission..."
              rows={3}
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
