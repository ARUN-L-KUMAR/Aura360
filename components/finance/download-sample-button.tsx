'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { generateSampleTemplate } from '@/lib/utils/excel-template'
import { toast } from 'sonner'

export function DownloadSampleButton() {
  const handleDownload = () => {
    try {
      generateSampleTemplate()
      toast.success('Sample template downloaded!')
    } catch (error) {
      toast.error('Failed to download template')
      console.error('Download error:', error)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2"
      onClick={handleDownload}
    >
      <Download className="h-4 w-4" />
      Download Sample Template
    </Button>
  )
}
