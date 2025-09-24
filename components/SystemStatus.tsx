import { Suspense } from 'react';
import { Check, X } from 'lucide-react';
import { getAgentStatusAction } from '@/lib/actions/task-actions';

async function SystemStatusContent() {
  const result = await getAgentStatusAction();
  
  if (!result.success || !result.agents) {
    return (
      <div className="premium-card border border-red-200 bg-red-50">
        <div className="flex items-center">
          <X className="text-red-500 w-4 h-4 mr-2" />
          <span className="text-foreground font-medium">System Status Unavailable</span>
        </div>
        <p className="text-red-600 text-sm mt-1">{result.error}</p>
      </div>
    );
  }

  const agents = result.agents;
  const totalTasks = agents.taskCount || 0;

  return (
    <div className="premium-card">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
        <span className="mr-2">🔧</span>
        System Status
      </h3>

      {/* Overall System Health */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 rounded-lg bg-muted hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-blue-600">{totalTasks}</div>
          <div className="text-sm text-muted-foreground">Total Tasks</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-green-600">
            {Object.keys(agents).filter(key => key !== 'taskCount' && key !== 'config').length}
          </div>
          <div className="text-sm text-muted-foreground">Active Agents</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-purple-600">
            {agents.config?.enableAI ? <Check className="w-5 h-5 text-green-600 inline-block" /> : <X className="w-5 h-5 text-red-600 inline-block" />}
          </div>
          <div className="text-sm text-muted-foreground">AI Enabled</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-orange-600">
            {agents.memory?.status === 'ready' ? <Check className="w-5 h-5 text-green-600 inline-block" /> : <X className="w-5 h-5 text-red-600 inline-block" />}
          </div>
          <div className="text-sm text-muted-foreground">Memory System</div>
        </div>
      </div>

      {/* Agent Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(agents).map(([key, agent]) => {
          if (key === 'taskCount' || key === 'config' || !agent || typeof agent !== 'object') return null;
          
          const agentData = agent as any;
          const isHealthy = agentData.status === 'ready';
          
          return (
            <div
              key={key}
              className={`p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                isHealthy ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-foreground capitalize">{key}</h4>
                <span className={`text-lg ${isHealthy ? 'text-green-500' : 'text-red-500'}`}>
                  {isHealthy ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </span>
              </div>
              
              <div className="text-sm text-muted-foreground mb-2">
                {agentData.name || `${key} Agent`}
              </div>
              
              {agentData.capabilities && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {agentData.capabilities.slice(0, 2).map((capability: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {capability.replace('_', ' ')}
                    </span>
                  ))}
                  {agentData.capabilities.length > 2 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      +{agentData.capabilities.length - 2}
                    </span>
                  )}
                </div>
              )}
              
              <div className="text-xs text-muted-foreground space-y-1">
                {agentData.aiEnabled !== undefined && (
                  <div className="inline-flex items-center gap-1">
                    <span>AI:</span>
                    {agentData.aiEnabled ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <X className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                )}
                {agentData.githubEnabled !== undefined && (
                  <div className="inline-flex items-center gap-1">
                    <span>GitHub:</span>
                    {agentData.githubEnabled ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <X className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                )}
                {agentData.slackEnabled !== undefined && (
                  <div className="inline-flex items-center gap-1">
                    <span>Slack:</span>
                    {agentData.slackEnabled ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <X className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                )}
                {agentData.chromaEnabled !== undefined && (
                  <div className="inline-flex items-center gap-1">
                    <span>ChromaDB:</span>
                    {agentData.chromaEnabled ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <X className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration Status */}
      <div className="mt-6 pt-4 border-t border-border">
        <h4 className="font-medium text-foreground mb-3">Configuration</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">AI Features</span>
            <span className={agents.config?.enableAI ? 'text-green-600' : 'text-red-600'}>
              {agents.config?.enableAI ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">GitHub Integration</span>
            <span className={agents.config?.enableGitHub ? 'text-green-600' : 'text-red-600'}>
              {agents.config?.enableGitHub ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Slack Notifications</span>
            <span className={agents.config?.enableSlack ? 'text-green-600' : 'text-red-600'}>
              {agents.config?.enableSlack ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Memory System</span>
            <span className={agents.config?.enableMemory ? 'text-green-600' : 'text-red-600'}>
              {agents.config?.enableMemory ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SystemStatusLoading() {
  return (
    <div className="premium-card">
      <div className="flex items-center mb-4">
        <div className="w-6 h-6 bg-gray-200 rounded mr-2 animate-pulse"></div>
        <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="text-center">
            <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-16 mx-auto animate-pulse"></div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
            <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SystemStatus() {
  return (
    <Suspense fallback={<SystemStatusLoading />}>
      <SystemStatusContent />
    </Suspense>
  );
}
