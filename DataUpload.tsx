'use client'

import { useState } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react'

interface NinetyData {
  scorecard?: any[]
  vto?: any[]
  issues?: any[]
  todos?: any[]
}

interface DataUploadProps {
  onDataUploaded: (data: NinetyData) => void
}

export default function DataUpload({ onDataUploaded }: DataUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const parseCSV = (csvText: string): NinetyData => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length < 2) throw new Error('CSV must have at least a header and one data row')
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const data: NinetyData = {}
    
    // Parse each line and categorize by the first column (type)
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      if (values.length < 2) continue
      
      const type = values[0].toLowerCase()
      const rowData: any = {}
      
      // Create object from headers and values
      for (let j = 1; j < headers.length && j < values.length; j++) {
        if (headers[j]) {
          rowData[headers[j]] = values[j]
        }
      }
      
      // Categorize data based on type
      switch (type) {
        case 'scorecard':
          if (!data.scorecard) data.scorecard = []
          data.scorecard.push(rowData)
          break
        case 'vto':
          if (!data.vto) data.vto = { vision: [], traction: [], objectives: [] }
          const category = rowData.category?.toLowerCase() || 'objectives'
          if (category === 'vision' || category === 'traction' || category === 'objectives') {
            data.vto[category].push({
              item: rowData.item || rowData.title || '',
              complete: rowData.complete === 'true' || rowData.complete === '1'
            })
          }
          break
        case 'issue':
          if (!data.issues) data.issues = []
          data.issues.push({
            title: rowData.title || '',
            description: rowData.description || '',
            priority: rowData.priority || 'medium',
            department: rowData.department || '',
            owner: rowData.owner || '',
            status: rowData.status || 'open',
            created: rowData.created || rowData.createdDate || '',
            due: rowData.due || rowData.dueDate || ''
          })
          break
        case 'todo':
          if (!data.todos) data.todos = []
          data.todos.push({
            title: rowData.title || '',
            description: rowData.description || '',
            priority: rowData.priority || 'medium',
            assignee: rowData.assignee || rowData.owner || '',
            dueDate: rowData.dueDate || rowData.due || '',
            complete: rowData.complete === 'true' || rowData.complete === '1'
          })
          break
      }
    }
    
    return data
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadStatus('idle')
    setMessage('')

    try {
      const text = await file.text()
      const data = parseCSV(text)
      
      // Validate that we have some data
      if (!data.scorecard && !data.vto && !data.issues && !data.todos) {
        throw new Error('No valid data found. Please check your CSV format.')
      }

      // Store data in localStorage for persistence
      localStorage.setItem('ninetyData', JSON.stringify(data))
      
      // Pass data to parent component
      onDataUploaded(data)
      
      setUploadStatus('success')
      setMessage('CSV data uploaded successfully! Dashboard updated with Ninety information.')
    } catch (error) {
      setUploadStatus('error')
      setMessage(error instanceof Error ? error.message : 'Failed to upload CSV data')
    } finally {
      setIsUploading(false)
    }
  }

  const downloadSampleCSV = () => {
    const sampleCSV = `type,metric,target,actual,status,owner
scorecard,Weekly Revenue,$65K,$68.2K,green,Sales Team
scorecard,New Leads,45,52,green,Marketing
scorecard,Conversion Rate,22%,24.8%,green,Sales Team
scorecard,Team Utilization,85%,78%,yellow,Operations
scorecard,Project Delivery,100%,95%,green,Project Mgmt
type,category,item,complete
vto,vision,Core Values Alignment,true
vto,vision,10-Year Target: $50M ARR,true
vto,vision,Market Leadership Position,false
vto,traction,Weekly Scorecard Green,false
vto,traction,Q4 Rocks 90% Complete,true
vto,objectives,25% YoY Revenue Growth,false
vto,objectives,Hire 5 Team Members,false
type,title,description,priority,department,owner,status,created,due
issue,Server Performance Issues,Slow response times affecting client deliverables,high,Operations,DevOps Team,overdue,2024-11-08,2024-11-10
issue,CRM Integration Delays,New CRM system integration is behind schedule,medium,Sales,IT Team,in-progress,2024-11-05,2024-11-15
issue,Office Space Optimization,Review and optimize current office layout,low,HR,Facilities,open,2024-11-03,2024-11-30
type,title,description,priority,assignee,dueDate,complete
todo,Review Q4 Marketing Budget,Analyze spend and adjust for Q1,medium,Marketing Director,2024-11-15,false
todo,Update Employee Handbook,Review and update company policies,low,HR Manager,2024-11-25,false
todo,Client Onboarding Process Review,Evaluate current onboarding process,high,Customer Success Lead,2024-11-12,false`

    const blob = new Blob([sampleCSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ninety-sample-data.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Ninety Data Upload</h2>
          <p className="text-sm text-gray-500">Upload your Ninety CSV data to populate the dashboard</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* File Upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <div className="text-sm text-gray-600 mb-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="font-medium text-indigo-600 hover:text-indigo-500">
                Click to upload
              </span>
              <span className="text-gray-500"> or drag and drop</span>
            </label>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </div>
          <p className="text-xs text-gray-500">CSV files only</p>
        </div>

        {/* Status Messages */}
        {uploadStatus === 'success' && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800">{message}</span>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">{message}</span>
          </div>
        )}

        {/* Sample Data Download */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Need sample data?</h3>
              <p className="text-xs text-gray-500">Download a CSV template to see the expected format</p>
            </div>
            <button
              onClick={downloadSampleCSV}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download CSV Template</span>
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">How to use:</h3>
          <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
            <li>Export your data from Ninety in CSV format</li>
            <li>Ensure the first column contains the data type (scorecard, vto, issue, todo)</li>
            <li>Upload the CSV file using the upload area above</li>
            <li>Your dashboard will automatically update with the new data</li>
            <li>Data is stored locally and persists between sessions</li>
          </ol>
        </div>

        {/* CSV Format Details */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-900 mb-2">CSV Format Requirements:</h3>
          <div className="text-xs text-yellow-800 space-y-2">
            <p><strong>Scorecard:</strong> type,metric,target,actual,status,owner</p>
            <p><strong>VTO:</strong> type,category,item,complete</p>
            <p><strong>Issues:</strong> type,title,description,priority,department,owner,status,created,due</p>
            <p><strong>Todos:</strong> type,title,description,priority,assignee,dueDate,complete</p>
            <p className="mt-2"><strong>Note:</strong> The first column must indicate the data type for proper categorization.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

