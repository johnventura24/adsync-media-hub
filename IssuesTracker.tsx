'use client'

import { useState, useEffect } from 'react'

interface Issue {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  department: string
  owner: string
  status: 'open' | 'in-progress' | 'resolved' | 'overdue'
  created: string
  due: string
}

interface IssuesTrackerProps {
  issuesData?: Issue[]
}

export default function IssuesTracker({ issuesData = [] }: IssuesTrackerProps) {
  const [issues, setIssues] = useState<Issue[]>(issuesData)

  useEffect(() => {
    // Load data from localStorage if no props provided
    if (issuesData.length === 0) {
      const stored = localStorage.getItem('ninetyData')
      if (stored) {
        try {
          const data = JSON.parse(stored)
          if (data.issues) {
            setIssues(data.issues)
          }
        } catch (error) {
          console.error('Failed to load issues data:', error)
        }
      }
    } else {
      setIssues(issuesData)
    }
  }, [issuesData])

  // Calculate stats
  const openCount = issues.filter(issue => issue.status === 'open').length
  const inProgressCount = issues.filter(issue => issue.status === 'in-progress').length
  const resolvedCount = issues.filter(issue => issue.status === 'resolved').length
  const overdueCount = issues.filter(issue => issue.status === 'overdue').length

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'in-progress': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'open': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'overdue': return 'OVERDUE'
      case 'in-progress': return 'IN PROGRESS'
      case 'resolved': return 'RESOLVED'
      case 'open': return 'OPEN'
      default: return status.toUpperCase()
    }
  }

  const getIssueBorderColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'border-red-200 bg-red-50'
      case 'in-progress': return 'border-yellow-200 bg-yellow-50'
      case 'resolved': return 'border-green-200 bg-green-50'
      case 'open': return 'border-gray-200'
      default: return 'border-gray-200'
    }
  }

  const averageResolutionDays = issues.length > 0 
    ? Math.round(issues.filter(issue => issue.status === 'resolved').length / issues.length * 7)
    : 0

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Issues Tracker</h2>
          <p className="text-sm text-gray-500">IDS: Identify • Discuss • Solve</p>
        </div>
        <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
          Add Issue
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{openCount}</div>
          <div className="text-sm text-gray-500">Open</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{inProgressCount}</div>
          <div className="text-sm text-gray-500">In Progress</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{resolvedCount}</div>
          <div className="text-sm text-gray-500">Resolved</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
          <div className="text-sm text-gray-500">Overdue</div>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-4">
        {issues.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No issues found. Upload your Ninety data to get started.
          </div>
        ) : (
          issues.map((issue, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${getIssueBorderColor(issue.status)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                      {issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)} Priority
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {issue.department}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{issue.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Owner: {issue.owner}</span>
                    <span>•</span>
                    <span>Created: {issue.created}</span>
                    <span>•</span>
                    <span className={issue.status === 'overdue' ? 'text-red-600 font-medium' : ''}>
                      Due: {issue.due}
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                    {getStatusText(issue.status)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {issues.length} active issues • {overdueCount} overdue • Average resolution: {averageResolutionDays} days
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
            Filter
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            Weekly Review
          </button>
        </div>
      </div>
    </div>
  )
} 