'use client'

import { useState, useEffect } from 'react'

interface ScorecardMetric {
  metric: string
  target: string
  actual: string
  status: 'green' | 'yellow' | 'red'
  owner: string
}

interface ScoreCardProps {
  scorecardData?: ScorecardMetric[]
}

export default function ScoreCard({ scorecardData = [] }: ScoreCardProps) {
  const [metrics, setMetrics] = useState<ScorecardMetric[]>(scorecardData)
  const [weekRange, setWeekRange] = useState('Week of Nov 4-10')

  useEffect(() => {
    // Load data from localStorage if no props provided
    if (scorecardData.length === 0) {
      const stored = localStorage.getItem('ninetyData')
      if (stored) {
        try {
          const data = JSON.parse(stored)
          if (data.scorecard) {
            setMetrics(data.scorecard)
          }
        } catch (error) {
          console.error('Failed to load scorecard data:', error)
        }
      }
    } else {
      setMetrics(scorecardData)
    }
  }, [scorecardData])

  // Calculate status counts
  const greenCount = metrics.filter(m => m.status === 'green').length
  const yellowCount = metrics.filter(m => m.status === 'yellow').length
  const redCount = metrics.filter(m => m.status === 'red').length

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'green':
        return (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 text-sm font-bold">
            ✓
          </span>
        )
      case 'yellow':
        return (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-800 text-sm font-bold">
            !
          </span>
        )
      case 'red':
        return (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800 text-sm font-bold">
            ×
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Weekly Scorecard</h2>
          <p className="text-sm text-gray-500">Key performance indicators</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">{weekRange}</div>
          <div className="text-lg font-semibold text-green-600">
            {greenCount} Green • {yellowCount} Yellow • {redCount} Red
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Metric</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Target</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Actual</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Owner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {metrics.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  No scorecard data available. Upload your Ninety data to get started.
                </td>
              </tr>
            ) : (
              metrics.map((metric, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{metric.metric}</td>
                  <td className="py-3 px-4 text-center text-gray-700">{metric.target}</td>
                  <td className="py-3 px-4 text-center font-semibold text-gray-900">{metric.actual}</td>
                  <td className="py-3 px-4 text-center">
                    {getStatusIcon(metric.status)}
                  </td>
                  <td className="py-3 px-4 text-gray-700">{metric.owner}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Status Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-800 text-xs font-bold">✓</span>
            <span className="text-gray-600">Green: On Target</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-bold">!</span>
            <span className="text-gray-600">Yellow: Needs Attention</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-800 text-xs font-bold">×</span>
            <span className="text-gray-600">Red: Critical</span>
          </div>
        </div>
        <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium">
          Export Report
        </button>
      </div>
    </div>
  )
} 