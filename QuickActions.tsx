'use client'

export default function QuickActions() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
          <p className="text-sm text-gray-500">Shortcuts to frequently used tools</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Team Directory */}
        <button className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-600 transition-colors">
            <span className="text-white text-lg font-bold">👥</span>
          </div>
          <span className="text-sm font-medium text-gray-900">Team Directory</span>
          <span className="text-xs text-gray-500 text-center mt-1">Contact info & roles</span>
        </button>

        {/* Knowledge Base */}
        <button className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-3 group-hover:bg-green-600 transition-colors">
            <span className="text-white text-lg font-bold">📚</span>
          </div>
          <span className="text-sm font-medium text-gray-900">Knowledge Base</span>
          <span className="text-xs text-gray-500 text-center mt-1">Docs & processes</span>
        </button>

        {/* Reports */}
        <button className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group">
          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mb-3 group-hover:bg-purple-600 transition-colors">
            <span className="text-white text-lg font-bold">📊</span>
          </div>
          <span className="text-sm font-medium text-gray-900">Reports</span>
          <span className="text-xs text-gray-500 text-center mt-1">Analytics dashboard</span>
        </button>

        {/* Calendar */}
        <button className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors group">
          <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-3 group-hover:bg-orange-600 transition-colors">
            <span className="text-white text-lg font-bold">📅</span>
          </div>
          <span className="text-sm font-medium text-gray-900">Calendar</span>
          <span className="text-xs text-gray-500 text-center mt-1">Meetings & events</span>
        </button>

        {/* Client Portal */}
        <button className="flex flex-col items-center p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors group">
          <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-600 transition-colors">
            <span className="text-white text-lg font-bold">🏢</span>
          </div>
          <span className="text-sm font-medium text-gray-900">Client Portal</span>
          <span className="text-xs text-gray-500 text-center mt-1">Client management</span>
        </button>

        {/* Time Tracking */}
        <button className="flex flex-col items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors group">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mb-3 group-hover:bg-red-600 transition-colors">
            <span className="text-white text-lg font-bold">⏰</span>
          </div>
          <span className="text-sm font-medium text-gray-900">Time Tracking</span>
          <span className="text-xs text-gray-500 text-center mt-1">Log hours & tasks</span>
        </button>

        {/* Project Management */}
        <button className="flex flex-col items-center p-4 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors group">
          <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center mb-3 group-hover:bg-teal-600 transition-colors">
            <span className="text-white text-lg font-bold">📋</span>
          </div>
          <span className="text-sm font-medium text-gray-900">Projects</span>
          <span className="text-xs text-gray-500 text-center mt-1">Task management</span>
        </button>

        {/* Finance */}
        <button className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors group">
          <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mb-3 group-hover:bg-yellow-600 transition-colors">
            <span className="text-white text-lg font-bold">💰</span>
          </div>
          <span className="text-sm font-medium text-gray-900">Finance</span>
          <span className="text-xs text-gray-500 text-center mt-1">Billing & expenses</span>
        </button>

        {/* Support Tickets */}
        <button className="flex flex-col items-center p-4 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors group">
          <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center mb-3 group-hover:bg-pink-600 transition-colors">
            <span className="text-white text-lg font-bold">🎫</span>
          </div>
          <span className="text-sm font-medium text-gray-900">Support</span>
          <span className="text-xs text-gray-500 text-center mt-1">Help desk tickets</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">23</div>
            <div className="text-sm text-gray-500">Active Projects</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">5</div>
            <div className="text-sm text-gray-500">Pending Approvals</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">12</div>
            <div className="text-sm text-gray-500">Open Tickets</div>
          </div>
        </div>
      </div>
    </div>
  )
} 