'use client'

export default function LiveMetrics() {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Live Metrics</h2>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-100">Live</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="text-4xl font-mono font-bold text-white mb-1">
            $247.6K
          </div>
          <div className="text-sm text-white/70">Monthly Revenue</div>
          <div className="text-xs font-medium text-green-300">+12.5%</div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="text-4xl font-mono font-bold text-white mb-1">
            34
          </div>
          <div className="text-sm text-white/70">Active Clients</div>
          <div className="text-xs font-medium text-green-300">+8.3%</div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="text-4xl font-mono font-bold text-white mb-1">
            24.8%
          </div>
          <div className="text-sm text-white/70">Conversion Rate</div>
          <div className="text-xs font-medium text-green-300">+3.2%</div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="text-4xl font-mono font-bold text-white mb-1">
            18.7%
          </div>
          <div className="text-sm text-white/70">Growth Rate</div>
          <div className="text-xs font-medium text-green-300">+5.1%</div>
        </div>
      </div>
    </div>
  )
} 