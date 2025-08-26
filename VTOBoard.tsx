'use client'

import { useState, useEffect } from 'react'

interface VTOItem {
  item: string
  complete: boolean
}

interface VTOData {
  vision: VTOItem[]
  traction: VTOItem[]
  objectives: VTOItem[]
}

interface VTOBoardProps {
  vtoData?: VTOData
}

export default function VTOBoard({ vtoData }: VTOBoardProps) {
  const [vto, setVto] = useState<VTOData>(vtoData || {
    vision: [],
    traction: [],
    objectives: []
  })

  useEffect(() => {
    // Load data from localStorage if no props provided
    if (!vtoData) {
      const stored = localStorage.getItem('ninetyData')
      if (stored) {
        try {
          const data = JSON.parse(stored)
          if (data.vto) {
            setVto(data.vto)
          }
        } catch (error) {
          console.error('Failed to load VTO data:', error)
        }
      }
    } else {
      setVto(vtoData)
    }
  }, [vtoData])

  const calculateProgress = (items: VTOItem[]) => {
    if (items.length === 0) return 0
    const completed = items.filter(item => item.complete).length
    return Math.round((completed / items.length) * 100)
  }

  const overallProgress = Math.round(
    (calculateProgress(vto.vision) + calculateProgress(vto.traction) + calculateProgress(vto.objectives)) / 3
  )

  const renderSection = (title: string, items: VTOItem[], color: string, letter: string) => {
    const progress = calculateProgress(items)
    const completedCount = items.filter(item => item.complete).length

    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 bg-gradient-to-r ${color} rounded-lg`}>
              <span className="text-white text-sm font-bold">{letter}</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <div className="text-sm text-gray-500">{completedCount} of {items.length} complete</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">{progress}%</div>
          </div>
        </div>

        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              No {title.toLowerCase()} items available
            </div>
          ) : (
            items.map((item, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                <div className="w-5 h-5 text-green-500">
                  {item.complete ? '✓' : '○'}
                </div>
                <span className={item.complete ? 'text-green-700 line-through' : 'text-gray-900'}>
                  {item.item}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">VTO Board</h2>
          <p className="text-sm text-gray-500">Vision • Traction • Objectives</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
          Update VTO
        </button>
      </div>

      <div className="space-y-6">
        {renderSection('Vision', vto.vision, 'from-purple-500 to-purple-600', 'V')}
        {renderSection('Traction', vto.traction, 'from-orange-500 to-orange-600', 'T')}
        {renderSection('Objectives', vto.objectives, 'from-blue-500 to-blue-600', 'O')}
      </div>

      {/* Overall Progress */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-900">Overall VTO Progress</h4>
            <p className="text-sm text-gray-500">Combined completion across all areas</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600">{overallProgress}%</div>
            <div className="text-sm text-gray-500">Complete</div>
          </div>
        </div>
      </div>
    </div>
  )
} 