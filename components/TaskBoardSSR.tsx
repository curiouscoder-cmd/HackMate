import { Suspense } from 'react';
import { Check } from 'lucide-react';
import { getTasksAction } from '@/lib/actions/task-actions';
import CollapsibleTaskSection from './CollapsibleTaskSection';
import { Task } from '@/lib/agents/planner-agent';

// Server component for SSR task board with timeout handling
async function TaskBoardContent() {
  let result: { success: boolean; tasks?: Task[]; error?: string };
  
  try {
    // Add timeout to prevent long blocking
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Task loading timeout')), 3000)
    );
    
    result = await Promise.race([
      getTasksAction(),
      timeoutPromise
    ]);
    
    if (!result.success || !result.tasks) {
      return (
        <div className="card">
          <div className="text-center py-8 text-yellow-500">
            <div className="text-2xl mb-2">⚡</div>
            <div className="text-sm">System initializing... Tasks will appear shortly.</div>
            <div className="text-xs mt-2 text-gray-500">Error: {result.error}</div>
          </div>
        </div>
      );
    }
  } catch (error) {
    // Handle timeout or other errors gracefully
    return (
      <div className="card">
        <div className="text-center py-8 text-blue-500">
          <div className="text-2xl mb-2">🚀</div>
          <div className="text-sm">System starting up... Please wait a moment.</div>
          <div className="text-xs mt-2 text-gray-500">This may take a few seconds on first load.</div>
        </div>
      </div>
    );
  }

  // This code will only run if we successfully got tasks
  const tasks = result.tasks!;
  const tasksByStatus = {
    queued: tasks.filter((task: Task) => task.status === 'queued'),
    in_progress: tasks.filter((task: Task) => task.status === 'in_progress'),
    done: tasks.filter((task: Task) => task.status === 'done'),
    failed: tasks.filter((task: Task) => task.status === 'failed'),
  };

  const statusConfig = {
    queued: { title: '📋 Queued', color: 'task-section task-section-queued' },
    in_progress: { title: '⚡ In Progress', color: 'task-section task-section-in-progress' },
    done: { title: 'Done', color: 'task-section task-section-done' },
    failed: { title: '❌ Failed', color: 'task-section task-section-failed' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          📊 Live Task Board
        </h2>
        <div className="text-sm text-gray-500">
          {tasks.length} total tasks
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

// Loading component
function TaskBoardLoading() {
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

// Main SSR TaskBoard component
export default function TaskBoardSSR() {
  return (
    <Suspense fallback={<TaskBoardLoading />}>
      <TaskBoardContent />
    </Suspense>
  );
}
