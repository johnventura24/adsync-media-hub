'use client'

export default function GoalsOverview() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Goals Overview</h2>
          <p className="text-sm text-gray-500">Track progress on key objectives</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          Add Goal
        </button>
      </div>

      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-semibold text-gray-900">Q4 Revenue Target</h3>
            <span className="px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-100">
              on-track
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-3">Achieve $800K in Q4 revenue</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">$650,000 / $800,000</span>
              <span className="text-sm text-gray-600">81%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-500 h-2.5 rounded-full" style={{width: '81%'}}></div>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
            <span>Owner: Sales Team</span>
            <span>•</span>
            <span>Due: 12/31/2024</span>
            <span>•</span>
            <span>Revenue</span>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-semibold text-gray-900">Client Acquisition</h3>
            <span className="px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-100">
              on-track
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-3">Acquire 15 new clients this quarter</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">12 / 15</span>
              <span className="text-sm text-gray-600">80%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-500 h-2.5 rounded-full" style={{width: '80%'}}></div>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
            <span>Owner: Marketing Team</span>
            <span>•</span>
            <span>Due: 12/31/2024</span>
            <span>•</span>
            <span>Growth</span>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-semibold text-gray-900">Team Expansion</h3>
            <span className="px-2 py-1 rounded-full text-xs font-medium text-yellow-600 bg-yellow-100">
              at-risk
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-3">Hire 5 new team members</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">3 / 5</span>
              <span className="text-sm text-gray-600">60%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-yellow-500 h-2.5 rounded-full" style={{width: '60%'}}></div>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
            <span>Owner: HR Team</span>
            <span>•</span>
            <span>Due: 11/30/2024</span>
            <span>•</span>
            <span>Operations</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">0</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">2</div>
            <div className="text-sm text-gray-500">On Track</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">1</div>
            <div className="text-sm text-gray-500">At Risk</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">0</div>
            <div className="text-sm text-gray-500">Overdue</div>
          </div>
        </div>
      </div>
    </div>
  )
} 