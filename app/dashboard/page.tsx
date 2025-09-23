import SystemStatus from '@/components/SystemStatus'
import BulkActions from '@/components/BulkActions'
import Header from '@/components/Header'
import DashboardStats from '@/components/DashboardStats'
import PerformanceMetrics from '@/components/PerformanceMetrics'
import IntegrationsPanel from '@/components/IntegrationsPanel'
import { Sparkles, Target, Zap } from 'lucide-react'

export const metadata = {
  title: 'AI Hack Mate - Advanced Dashboard',
  description: 'Complete system overview with agent status and task management',
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-primary-soft/10 to-secondary-soft/10 dark:from-gray-950 dark:via-primary-900/10 dark:to-gray-900">
      <div className="w-full">
        {/* Header with animation */}
        <div className="fade-in">
          <Header />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Dashboard Stats Overview */}
          <div className="mb-8">
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
                <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent/80 rounded-xl flex items-center justify-center mr-3">
                  <Sparkles className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
                  <p className="text-sm text-muted-foreground">Common dashboard operations</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button className="btn-ghost p-4 h-auto flex flex-col items-center">
                  <Target className="w-5 h-5 mb-2" />
                  <span className="text-sm">New Task</span>
                </button>
                
                <button className="btn-ghost p-4 h-auto flex flex-col items-center">
                  <Zap className="w-5 h-5 mb-2" />
                  <span className="text-sm">Quick Deploy</span>
                </button>
                
                <button className="btn-ghost p-4 h-auto flex flex-col items-center">
                  <span className="text-lg mb-1">📊</span>
                  <span className="text-sm">Analytics</span>
                </button>
                
                <button className="btn-ghost p-4 h-auto flex flex-col items-center">
                  <span className="text-lg mb-1">⚙️</span>
                  <span className="text-sm">Settings</span>
                </button>
              </div>
            </div>
            
            {/* System Health Card */}
            <div className="premium-card fade-in stagger-4">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-success-500 to-success-500/80 rounded-xl flex items-center justify-center mr-3">
                  <span className="text-white text-lg">💚</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">System Health</h3>
                  <p className="text-sm text-muted-foreground">Real-time system monitoring</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">CPU Usage</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-success-500 to-success-500/80 w-3/4 rounded-full"></div>
                    </div>
                    <span className="text-sm font-medium text-green-600">75%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Memory</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-warning-500 to-warning-500/80 w-2/3 rounded-full"></div>
                    </div>
                    <span className="text-sm font-medium text-warning-600">67%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Network</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary-500 to-secondary-soft w-1/2 rounded-full"></div>
                    </div>
                    <span className="text-sm font-medium text-primary-600">50%</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Overall Status</span>
                    <span className="text-green-600 font-medium">Healthy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
