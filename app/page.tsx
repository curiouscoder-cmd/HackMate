import TaskBoardSSR from '@/components/TaskBoardSSR'
import ProblemInputSSR from '@/components/ProblemInputSSR'
import Header from '@/components/Header'

export const metadata = {
  title: 'AI Hack Mate - Dashboard',
  description: 'Multi-agent system for automated software development',
}

export default function Home() {
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
              <TaskBoardSSR />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
