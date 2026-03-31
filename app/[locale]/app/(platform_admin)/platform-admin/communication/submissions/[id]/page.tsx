import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getWebsiteSubmissionById } from '@/actions/platform-admin/get-website-submissions'
import { SubmissionDetail } from './components/SubmissionDetail'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function SubmissionDetailPage({ params }: PageProps) {
  const { locale, id } = await params

  const submission = await getWebsiteSubmissionById(id)
  if (!submission) notFound()

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        {/* Back link */}
        <a
          href={`/${locale}/app/platform-admin/communication/submissions`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to submissions
        </a>

        <SubmissionDetail submission={submission} locale={locale} />
      </div>
    </div>
  )
}
