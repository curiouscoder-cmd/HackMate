'use client'

import { useState, useEffect } from 'react';
import { Task } from '@/lib/agents/planner-agent';
import CollapsibleTaskSection from './CollapsibleTaskSection';

interface TaskBoardClientProps {
  initialTasks?: Task[];
  initialError?: string;
}

export default function TaskBoardClient({ initialTasks = [], initialError }: TaskBoardClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [loading, setLoading] = useState(!initialTasks.length && !initialError);
  const [error, setError] = useState<string | null>(initialError || null);

  // Fetch tasks on mount if we don't have initial data
  useEffect(() => {
    if (!initialTasks.length && !initialError) {
      fetchTasks();
    }
  }, [initialTasks.length, initialError]);

  // Poll for updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        fetchTasks(true); // Silent refresh
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [loading]);

  const fetchTasks = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tasks', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.tasks) {
        setTasks(data.tasks);
        setError(null);
      } else {
        setError(data.error || 'Failed to load tasks');
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>
        
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg border-2 bg-gray-50 border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4 p-2 -m-2">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
              </div>
              <div className="space-y-2">
                {[...Array(2)].map((_, j) => (
                  <div key={j} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="text-2xl mb-2">🚀</div>
          <div className="text-sm text-blue-600 mb-2">System is starting up...</div>
          <div className="text-xs text-gray-500 mb-4">
            This may take a few moments on first load while we initialize the AI agents.
          </div>
          <button
            onClick={() => fetchTasks()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          <div className="text-xs text-gray-400 mt-2">Error: {error}</div>
        </div>
      </div>
    );
  }

  const tasksByStatus = {
    queued: tasks.filter((task: Task) => task.status === 'queued'),
    in_progress: tasks.filter((task: Task) => task.status === 'in_progress'),
    done: tasks.filter((task: Task) => task.status === 'done'),
    failed: tasks.filter((task: Task) => task.status === 'failed'),
  };

  const statusConfig = {
    queued: { title: '📋 Queued', color: 'task-section task-section-queued' },
    in_progress: { title: '⚡ In Progress', color: 'task-section task-section-in-progress' },
    done: { title: '✅ Done', color: 'task-section task-section-done' },
    failed: { title: '❌ Failed', color: 'task-section task-section-failed' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          📊 Live Task Board
        </h2>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-500">
            {tasks.length} total tasks
          </div>
          <button
            onClick={() => fetchTasks()}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            title="Refresh tasks"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(statusConfig).map(([status, config]) => (
          <CollapsibleTaskSection
            key={status}
            status={status}
            title={config.title}
            color={config.color}
            tasks={tasksByStatus[status as keyof typeof tasksByStatus]}
            count={tasksByStatus[status as keyof typeof tasksByStatus].length}
          />
        ))}
      </div>
    </div>
  );
}
