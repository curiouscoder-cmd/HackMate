'use client';

import { useState, useEffect } from 'react';

interface TaskStatus {
  id: string;
  title: string;
  agent: string;
  status: 'queued' | 'in_progress' | 'done' | 'failed';
  description: string;
  progress?: number;
  timestamp: string;
}

interface AIStatusProps {
  isActive: boolean;
  currentTask?: string;
  onClose?: () => void;
}

export default function AIStatusIndicator({ isActive, currentTask, onClose }: AIStatusProps) {
  const [tasks, setTasks] = useState<TaskStatus[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setTasks([]);
      setTotalTasks(0);
      setCompletedTasks(0);
      return;
    }

    // Simulate task updates (in real implementation, this would come from WebSocket or polling)
    const interval = setInterval(() => {
      // This would be replaced with actual task status fetching
      fetchTaskStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [isActive]);

  const fetchTaskStatus = async () => {
    try {
      // In real implementation, fetch from /api/tasks or WebSocket
      // For now, simulate some tasks
      if (isActive && currentTask) {
        const mockTasks: TaskStatus[] = [
          {
            id: '1',
            title: 'Analyzing Repository',
            agent: 'Planner Agent',
            status: 'done',
            description: 'Examining repository structure and patterns',
            progress: 100,
            timestamp: new Date().toISOString()
          },
          {
            id: '2',
            title: 'Generating Implementation Plan',
            agent: 'Planner Agent',
            status: 'in_progress',
            description: 'Creating detailed task breakdown',
            progress: 65,
            timestamp: new Date().toISOString()
          },
          {
            id: '3',
            title: 'Implementing Changes',
            agent: 'Coder Agent',
            status: 'queued',
            description: 'Writing code changes based on plan',
            progress: 0,
            timestamp: new Date().toISOString()
          }
        ];
        
        setTasks(mockTasks);
        setTotalTasks(mockTasks.length);
        setCompletedTasks(mockTasks.filter(t => t.status === 'done').length);
      }
    } catch (error) {
      console.error('Failed to fetch task status:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <span className="text-green-500">✅</span>;
      case 'in_progress':
        return <span className="text-blue-500 animate-spin">⚙️</span>;
      case 'failed':
        return <span className="text-red-500">❌</span>;
      default:
        return <span className="text-gray-400">⏳</span>;
    }
  };

  const getAgentColor = (agent: string) => {
    switch (agent.toLowerCase()) {
      case 'planner agent':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30';
      case 'coder agent':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'debugger agent':
        return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'pm agent':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (!isActive && tasks.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-md">
      {/* Collapsed View */}
      <div 
        className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg transition-all duration-300 ${
          isExpanded ? 'mb-2' : ''
        }`}
      >
        <div 
          className="p-4 cursor-pointer flex items-center justify-between"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-3 h-3 bg-blue-500 rounded-full animate-ping opacity-75"></div>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                AI Working...
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {totalTasks > 0 ? `${completedTasks}/${totalTasks} tasks completed` : 'Initializing...'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {totalTasks > 0 && (
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {overallProgress}%
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {totalTasks > 0 && (
          <div className="px-4 pb-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Task Progress</h3>
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          <div className="p-4 space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-4">
                <div className="animate-spin text-2xl mb-2">⚙️</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Initializing AI agents...
                </p>
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getStatusIcon(task.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {task.title}
                        </h4>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getAgentColor(task.agent)}`}>
                          {task.agent}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {task.description}
                      </p>
                      
                      {/* Progress bar for individual task */}
                      {task.status === 'in_progress' && task.progress !== undefined && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                          <div 
                            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
