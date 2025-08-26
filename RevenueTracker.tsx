'use client'

export default function RevenueTracker() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Revenue Tracker</h2>
          <p className="text-sm text-gray-500">Real-time revenue monitoring</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">
            $247,650
          </div>
          <div className="text-sm text-gray-500">This Month</div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-4 mb-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Monthly Target</span>
            <span className="text-sm text-gray-600">95.3%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-green-500 h-2.5 rounded-full" style={{width: '95.3%'}}></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>$0</span>
            <span>$260,000</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Yearly Target</span>
            <span className="text-sm text-gray-600">72.7%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-500 h-2.5 rounded-full" style={{width: '72.7%'}}></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>$0</span>
            <span>$3,000,000</span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">7.6%</div>
          <div className="text-sm text-gray-500">Conversion Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">$2,608</div>
          <div className="text-sm text-gray-500">Avg Deal Size</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">18</div>
          <div className="text-sm text-gray-500">Days Avg Cycle</div>
        </div>
      </div>
    </div>
  )
} 