import React from 'react'
import { FileSpreadsheet, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GoogleSheetPreviewProps {
  sheetData: any
}

export default function GoogleSheetPreview({ sheetData }: GoogleSheetPreviewProps) {
  if (!sheetData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-medium">No Sheet Loaded</h3>
          <p className="text-muted-foreground">
            Enter a Google Sheet URL in the Compose tab to preview the data.
          </p>
        </div>
      </div>
    )
  }

  const exportToCSV = () => {
    if (!sheetData.rows || sheetData.rows.length === 0) return

    const headers = sheetData.headers
    const csvContent = [
      headers.join(','),
      ...sheetData.rows.map((row: any) => 
        headers.map(header => {
          const value = row[header] || ''
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sheetData.sheetName || 'sheet'}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Google Sheet Preview</h3>
          <p className="text-sm text-muted-foreground">
            {sheetData.sheetName} • {sheetData.totalRows} rows • {sheetData.headers.length} columns
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Sheet Info */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Spreadsheet ID:</span>
            <p className="text-muted-foreground font-mono text-xs break-all">
              {sheetData.spreadsheetId}
            </p>
          </div>
          <div>
            <span className="font-medium">Sheet Name:</span>
            <p className="text-muted-foreground">{sheetData.sheetName}</p>
          </div>
          <div>
            <span className="font-medium">Total Rows:</span>
            <p className="text-muted-foreground">{sheetData.totalRows}</p>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 border rounded-lg overflow-hidden bg-background">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {sheetData.headers.map((header: string, index: number) => (
                  <th
                    key={index}
                    className="px-4 py-3 text-left text-sm font-medium text-muted-foreground border-b"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheetData.rows.map((row: any, rowIndex: number) => (
                <tr
                  key={rowIndex}
                  className={rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                >
                  {sheetData.headers.map((header: string, colIndex: number) => (
                    <td
                      key={colIndex}
                      className="px-4 py-3 text-sm border-b"
                    >
                      <div className="max-w-48 truncate" title={String(row[header] || '')}>
                        {String(row[header] || '')}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Placeholder Help */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-medium mb-2">How to Use This Data:</h4>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Use <code className="bg-muted px-1 rounded">((column_name))</code> in your email subject and body
          </p>
          <p>
            • The app will automatically replace placeholders with values from each row
          </p>
          <p>
            • Example: <code className="bg-muted px-1 rounded">Hello ((name)), welcome to ((company))!</code>
          </p>
          <p>
            • Each recipient will receive a personalized email with their specific data
          </p>
        </div>
      </div>
    </div>
  )
}
