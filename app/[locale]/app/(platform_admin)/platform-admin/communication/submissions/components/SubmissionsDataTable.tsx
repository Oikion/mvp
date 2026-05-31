'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Search, MoreHorizontal, Eye, Mail, Archive, ExternalLink } from 'lucide-react'
import { updateSubmissionStatus } from '@/actions/platform-admin/get-website-submissions'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
}

interface Props {
  submissions: Submission[]
  totalCount: number
  page: number
  totalPages: number
  currentSearch: string
  currentStatus: string
  currentType: string
  locale: string
}

const STATUS_CONFIG: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  NEW: { variant: 'default', label: 'New' },
  READ: { variant: 'secondary', label: 'Read' },
  CONTACTED: { variant: 'outline', label: 'Contacted' },
  ARCHIVED: { variant: 'destructive', label: 'Archived' },
}

const TYPE_LABELS: Record<string, string> = {
  invest: 'Investor',
  partner: 'Partnership',
  try: 'Platform Trial',
  ask: 'Question',
}

export function SubmissionsDataTable({
  submissions,
  totalCount,
  page,
  totalPages,
  currentSearch,
  currentStatus,
  currentType,
  locale,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(currentSearch)

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== 'ALL') params.set(key, value)
      else params.delete(key)
    }
    if (!updates.page) params.set('page', '1')
    router.push(`?${params.toString()}`)
  }, [router, searchParams])

  const handleStatusChange = async (e: React.MouseEvent, id: string, status: 'NEW' | 'READ' | 'CONTACTED' | 'ARCHIVED') => {
    e.stopPropagation()
    await updateSubmissionStatus(id, status)
    router.refresh()
  }

  const goToDetail = (id: string) => {
    router.push(`/${locale}/app/platform-admin/communication/submissions/${id}`)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && updateParams({ search })}
            className="pl-9"
          />
        </div>
        <Select value={currentStatus} onValueChange={(v) => updateParams({ status: v })}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="READ">Read</SelectItem>
            <SelectItem value="CONTACTED">Contacted</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={currentType} onValueChange={(v) => updateParams({ type: v })}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="invest">Investor</SelectItem>
            <SelectItem value="partner">Partnership</SelectItem>
            <SelectItem value="try">Platform Trial</SelectItem>
            <SelectItem value="ask">Question</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Email Sent</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No submissions found.
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((sub) => (
                <TableRow
                  key={sub.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => goToDetail(sub.id)}
                >
                  <TableCell className="font-medium">
                    {sub.name}
                    {sub.orgName && (
                      <span className="block text-xs text-muted-foreground">{sub.orgName}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{sub.email}</TableCell>
                  <TableCell>
                    <span className="text-xs font-medium">{TYPE_LABELS[sub.inquiryType] ?? sub.inquiryType}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_CONFIG[sub.status]?.variant ?? 'secondary'}>
                      {STATUS_CONFIG[sub.status]?.label ?? sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs ${sub.emailSentAt ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {sub.emailSentAt ? 'Yes' : 'No'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 pointer-coarse:min-h-11 pointer-coarse:min-w-11">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => goToDetail(sub.id)}>
                          <ExternalLink className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleStatusChange(e, sub.id, 'READ')}>
                          <Eye className="mr-2 h-4 w-4" /> Mark as Read
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleStatusChange(e, sub.id, 'CONTACTED')}>
                          <Mail className="mr-2 h-4 w-4" /> Mark as Contacted
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleStatusChange(e, sub.id, 'ARCHIVED')}>
                          <Archive className="mr-2 h-4 w-4" /> Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount} submission{totalCount !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateParams({ page: String(page - 1) })}
          >
            Previous
          </Button>
          <span className="flex items-center text-sm text-muted-foreground px-2">
            {page} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => updateParams({ page: String(page + 1) })}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
