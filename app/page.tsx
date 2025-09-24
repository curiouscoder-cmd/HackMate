import TaskBoardClient from '@/components/TaskBoardClient'
import ProblemInputSSR from '@/components/ProblemInputSSR'
import Header from '@/components/Header'
import { getTasksAction } from '@/lib/actions/task-actions'

export const metadata = {
  title: 'AI Hack Mate - Dashboard',
  description: 'Multi-agent system for automated software development',
}

export default async function Home() {
  // Try to get initial tasks quickly, but don't block the page if it takes too long
  let initialTasks = [];
  let initialError = null;
  
  try {
    // Set a very short timeout for initial data
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Initial load timeout')), 1000)
    );
    
    const result = await Promise.race([
      getTasksAction(),
      timeoutPromise
    ]) as { success: boolean; tasks?: any[]; error?: string };
    
    if (result.success && result.tasks) {
      initialTasks = result.tasks;
    } else {
      initialError = result.error || 'Failed to load initial tasks';
    }
  } catch (error) {
    // Don't block the page, let client handle loading
    initialError = 'System initializing...';
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-primary-soft/10 to-secondary-soft/10 dark:from-gray-950 dark:via-primary-900/10 dark:to-gray-900">
      <div className="w-full px-0 pb-8">
        <Header fullWidth />
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            <div className="lg:col-span-1">
              <ProblemInputSSR />
            </div>
            <div className="lg:col-span-2">
              <TaskBoardClient 
                initialTasks={initialTasks}
                initialError={initialError || undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
