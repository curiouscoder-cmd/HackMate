import { Suspense } from 'react';
import { getTasksAction } from '@/lib/actions/task-actions';
import { generateAnalytics } from '@/lib/analytics/task-analytics';
import Header from '@/components/Header';

async function AnalyticsContent() {
  const result = await getTasksAction();
  
  if (!result.success || !result.tasks) {
    return (
      <div className="premium-card border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <div className="flex items-center">
          <span className="text-red-500 text-lg mr-2">❌</span>
          <span className="text-foreground font-medium">Analytics Unavailable</span>
        </div>
        <p className="text-red-600 dark:text-red-400 text-sm mt-1">{result.error}</p>
      </div>
    );
  }

  const analytics = generateAnalytics(result.tasks);

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="premium-card hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
              <p className="text-3xl font-bold text-foreground">{analytics.overview.totalTasks}</p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>

        <div className="premium-card hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
              <p className="text-3xl font-bold text-green-600">{analytics.overview.successRate.toFixed(1)}%</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="premium-card hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg. Time</p>
              <p className="text-3xl font-bold text-blue-600">{analytics.overview.avgCompletionTime.toFixed(1)}m</p>
            </div>
            <div className="text-4xl">⏱️</div>
          </div>
        </div>

        <div className="premium-card hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
              <p className="text-3xl font-bold text-purple-600">${analytics.costs.totalCost.toFixed(2)}</p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>
      </div>

      {/* Agent Performance */}
      <div className="premium-card">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
          <span className="mr-2">🤖</span>
          Agent Performance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(analytics.performance.agentPerformance).map(([agent, performance]) => (
            <div key={agent} className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h4 className="font-medium text-foreground capitalize mb-3">{agent}</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-medium text-foreground">{performance.tasksCompleted}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Success Rate</span>
                  <span className="font-medium text-green-600">{performance.successRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg Time</span>
                  <span className="font-medium text-blue-600">{performance.avgTime.toFixed(1)}m</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cost</span>
                  <span className="font-medium text-purple-600">${performance.totalCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Trends */}
      <div className="premium-card">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
          <span className="mr-2">📈</span>
          Daily Trends (Last 7 Days)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600">
                <th className="text-left py-2 text-gray-600 dark:text-gray-400">Date</th>
                <th className="text-left py-2 text-gray-600 dark:text-gray-400">Completed</th>
                <th className="text-left py-2 text-gray-600 dark:text-gray-400">Failed</th>
                <th className="text-left py-2 text-gray-600 dark:text-gray-400">Avg Time</th>
              </tr>
            </thead>
            <tbody>
              {analytics.performance.dailyTrends.map((day, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-2 text-gray-900 dark:text-gray-100">{day.date}</td>
                  <td className="py-2 text-green-600 dark:text-green-400">{day.completed}</td>
                  <td className="py-2 text-red-600 dark:text-red-400">{day.failed}</td>
                  <td className="py-2 text-blue-600 dark:text-blue-400">{day.avgTime.toFixed(1)}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Productivity Insights */}
      <div className="premium-card">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
          <span className="mr-2">💡</span>
          Productivity Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-foreground mb-3">Peak Hours</h4>
            <div className="space-y-2">
              {analytics.productivity.peakHours.map((hour, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded hover:shadow-sm">
                  <span className="text-sm text-foreground">{hour}</span>
                  <span className="text-xs text-blue-600">Peak</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-3">Recommendations</h4>
            <div className="space-y-2">
              {analytics.productivity.recommendations.map((rec, index) => (
                <div key={index} className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded hover:shadow-sm">
                  <span className="text-sm text-foreground">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      {analytics.costs.totalCost > 0 && (
        <div className="premium-card">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
            <span className="mr-2">💰</span>
            Cost Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-foreground mb-3">By Model</h4>
              <div className="space-y-2">
                {Object.entries(analytics.costs.costByModel).map(([model, cost]) => (
                  <div key={model} className="flex justify-between items-center p-2 border border-border rounded hover:bg-muted">
                    <span className="text-sm text-foreground">{model}</span>
                    <span className="text-sm font-medium text-purple-600">${cost.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-foreground mb-3">By Agent</h4>
              <div className="space-y-2">
                {Object.entries(analytics.costs.costByAgent).map(([agent, cost]) => (
                  <div key={agent} className="flex justify-between items-center p-2 border border-border rounded hover:bg-muted">
                    <span className="text-sm text-foreground capitalize">{agent}</span>
                    <span className="text-sm font-medium text-purple-600">${cost.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsLoading() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-40 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-600 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'AI Hack Mate - Analytics',
  description: 'Advanced analytics and performance metrics for your AI agents',
}

export default function AnalyticsPage() {
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-background via-primary-soft/10 to-secondary-soft/10 dark:from-gray-950 dark:via-primary-900/10 dark:to-gray-900">
      <div className="w-full px-6 py-8">
        <Header />
        
        <div className="mt-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">📊 Analytics Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Comprehensive insights into your AI agent performance and productivity
            </p>
          </div>
          
          <Suspense fallback={<AnalyticsLoading />}>
            <AnalyticsContent />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
