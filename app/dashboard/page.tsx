import SystemStatus from '@/components/SystemStatus'
import BulkActions from '@/components/BulkActions'
import Header from '@/components/Header'
import DashboardStats from '@/components/DashboardStats'
import PerformanceMetrics from '@/components/PerformanceMetrics'
import IntegrationsPanel from '@/components/IntegrationsPanel'

export const metadata = {
  title: 'AI Hack Mate - Advanced Dashboard',
  description: 'Complete system overview with agent status and task management',
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header with animation */}
        <div className="fade-in">
          <Header />
        </div>
        
        {/* Dashboard Stats Overview */}
        <div className="mt-8">
          <DashboardStats />
        </div>
        
        {/* System Status Section */}
        <div className="mb-8 slide-up stagger-1">
          <SystemStatus />
        </div>
        
        {/* Main Dashboard Content - Enhanced Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 mb-8">
          {/* Performance Metrics - Full width on mobile, half on lg, third on xl */}
          <div className="lg:col-span-1">
            <PerformanceMetrics />
          </div>
          
          {/* Integrations Panel */}
          <div className="lg:col-span-1">
            <IntegrationsPanel />
          </div>
          
          {/* Bulk Actions */}
          <div className="lg:col-span-2 xl:col-span-1 fade-in stagger-1">
            <BulkActions />
          </div>
        </div>
        
        {/* Additional Dashboard Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Quick Actions Card */}
          <div className="premium-card fade-in stagger-3">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white text-lg">⚡</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                <p className="text-sm text-gray-500">Common dashboard operations</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button className="p-4 rounded-xl border border-gray-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-200 transition-all duration-200 group text-left">
                <div className="text-2xl mb-2">📊</div>
                <div className="font-medium text-gray-900 group-hover:text-blue-700 text-sm">View Reports</div>
              </button>
              
              <button className="p-4 rounded-xl border border-gray-200 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:border-green-200 transition-all duration-200 group text-left">
                <div className="text-2xl mb-2">⚙️</div>
                <div className="font-medium text-gray-900 group-hover:text-green-700 text-sm">Settings</div>
              </button>
              
              <button className="p-4 rounded-xl border border-gray-200 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:border-purple-200 transition-all duration-200 group text-left">
                <div className="text-2xl mb-2">🔍</div>
                <div className="font-medium text-gray-900 group-hover:text-purple-700 text-sm">Analytics</div>
              </button>
              
              <button className="p-4 rounded-xl border border-gray-200 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 hover:border-orange-200 transition-all duration-200 group text-left">
                <div className="text-2xl mb-2">📋</div>
                <div className="font-medium text-gray-900 group-hover:text-orange-700 text-sm">Logs</div>
              </button>
            </div>
          </div>
          
          {/* System Health Card */}
          <div className="premium-card fade-in stagger-4">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white text-lg">💚</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
                <p className="text-sm text-gray-500">Real-time system monitoring</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse mr-3"></div>
                  <span className="text-sm font-medium text-gray-900">API Status</span>
                </div>
                <span className="text-sm text-green-600 font-medium">Operational</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse mr-3"></div>
                  <span className="text-sm font-medium text-gray-900">Database</span>
                </div>
                <span className="text-sm text-blue-600 font-medium">Connected</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse mr-3"></div>
                  <span className="text-sm font-medium text-gray-900">AI Services</span>
                </div>
                <span className="text-sm text-purple-600 font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer Section */}
        <div className="mt-12 text-center fade-in stagger-4">
          <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>All systems operational</span>
            <span className="mx-2">•</span>
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </main>
  )
}
