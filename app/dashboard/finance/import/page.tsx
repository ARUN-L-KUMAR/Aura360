'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, Loader2, Upload, Trash2, Info } from 'lucide-react'

export default function BulkImportPage() {
  const [importing, setImporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<any>(null)

  // Check import status
  const checkStatus = async () => {
    try {
      const response = await fetch('/api/finance/bulk-import')
      const data = await response.json()
      setStatus(data)
    } catch (err: any) {
      console.error('Status check failed:', err)
    }
  }

  // Bulk import
  const handleImport = async () => {
    setImporting(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/finance/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setResult(data)
      await checkStatus()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  // Delete all transactions
  const handleDelete = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL your transactions. Are you sure?')) {
      return
    }

    setDeleting(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/finance/bulk-import', {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Delete failed')
      }

      setResult(data)
      await checkStatus()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  // Load status on mount
  useState(() => {
    checkStatus()
  })

  return (
    <div className="container max-w-4xl py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Finance Data Import</h1>
          <p className="text-muted-foreground mt-2">
            Import your historical finance data from CSV into the database
          </p>
        </div>

        {/* Status Card */}
        {status && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Import Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Transactions in Database:</span>
                <span className="font-semibold">{status.imported}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Transactions in CSV:</span>
                <span className="font-semibold">{status.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status:</span>
                <span className={`font-semibold ${status.isComplete ? 'text-green-600' : 'text-orange-600'}`}>
                  {status.isComplete ? '✓ Complete' : '⚠ Incomplete'}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>About This Import</CardTitle>
            <CardDescription>
              This tool imports your historical finance data (266 transactions) from January 2024 to November 2025
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold mb-2">📊 Data Summary</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <strong>266</strong> total transactions</li>
                <li>• <strong>₹2,34,021</strong> total income</li>
                <li>• <strong>₹53,280</strong> total expenses</li>
                <li>• <strong>₹1,80,741</strong> net balance</li>
                <li>• Period: <strong>Jan 2024 - Nov 2025</strong></li>
              </ul>
            </div>

            <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <h4 className="font-semibold mb-2">⚠️ Important Notes</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Run this import <strong>only once</strong></li>
                <li>• All transactions will be linked to your user account</li>
                <li>• You can delete and re-import if needed</li>
                <li>• After import, use the regular finance module for new transactions</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={handleImport}
                disabled={importing || deleting || (status?.isComplete && !status?.canImport)}
                className="flex-1"
                size="lg"
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Transactions
                  </>
                )}
              </Button>

              <Button
                onClick={handleDelete}
                disabled={importing || deleting || status?.imported === 0}
                variant="destructive"
                size="lg"
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete All
                  </>
                )}
              </Button>
            </div>

            {status?.isComplete && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  ✓ Data already imported. You can delete and re-import if needed.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                Success
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">{result.message}</p>
              {result.stats && (
                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-semibold">{result.stats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Successful:</span>
                    <span className="font-semibold text-green-600">{result.stats.successful}</span>
                  </div>
                  {result.stats.failed > 0 && (
                    <div className="flex justify-between">
                      <span>Failed:</span>
                      <span className="font-semibold text-red-600">{result.stats.failed}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Batches:</span>
                    <span className="font-semibold">{result.stats.batches}</span>
                  </div>
                </div>
              )}
              {result.deletedCount !== undefined && (
                <p className="text-sm">
                  Deleted <strong>{result.deletedCount}</strong> transactions
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li>1. Click "Import Transactions" to load your historical data</li>
              <li>2. Go to <a href="/dashboard/finance" className="text-blue-600 hover:underline">/dashboard/finance</a> to view your transactions</li>
              <li>3. Review the financial analysis and insights</li>
              <li>4. Start adding new transactions through the finance module</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
