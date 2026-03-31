import { Mail } from 'lucide-react'
import { getWebsiteSubmissions } from '@/actions/platform-admin/get-website-submissions'
import { SubmissionsDataTable } from './components/SubmissionsDataTable'

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
    type?: string
  }>
}

export default async function SubmissionsPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params
  const search = await searchParams

  const page = parseInt(search.page || '1', 10)
  const searchQuery = search.search || ''
  const status = search.status || 'ALL'
  const inquiryType = search.type || 'ALL'

  const data = await getWebsiteSubmissions({
    page,
    limit: 20,
    search: searchQuery,
    status,
    inquiryType,
  })

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Form Submissions
            </h1>
            <p className="text-muted-foreground">
              Contact form submissions from the website
            </p>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-medium text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{data.totalCount}</p>
          </div>
          {(['NEW', 'READ', 'CONTACTED', 'ARCHIVED'] as const).map(s => (
            <div key={s} className="rounded-lg border bg-card p-4">
              <p className="text-sm font-medium text-muted-foreground">{s.charAt(0) + s.slice(1).toLowerCase()}</p>
              <p className="text-2xl font-bold">{data.countsByStatus[s] ?? 0}</p>
            </div>
          ))}
        </div>

        {/* Data Table */}
        <SubmissionsDataTable
          submissions={data.submissions}
          totalCount={data.totalCount}
          page={data.page}
          totalPages={data.totalPages}
          currentSearch={searchQuery}
          currentStatus={status}
          currentType={inquiryType}
          locale={locale}
        />
      </div>
    </div>
  )
}
