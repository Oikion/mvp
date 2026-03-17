"use client"

interface HtmlPreviewPanelProps {
  html: string
  isLoading?: boolean
}

export function HtmlPreviewPanel({ html, isLoading }: HtmlPreviewPanelProps) {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Rendering HTML...
      </div>
    )
  }

  if (!html) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Add blocks to generate HTML
      </div>
    )
  }

  return (
    <pre className="text-xs overflow-auto max-h-screen whitespace-pre-wrap bg-muted p-4 rounded font-mono">
      {html}
    </pre>
  )
}
