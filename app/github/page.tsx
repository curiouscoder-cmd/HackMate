import GitHubWorkflow from '@/components/GitHubWorkflow'
import GitHubStatus from '@/components/GitHubStatus'
import PerformanceMonitor from '@/components/PerformanceMonitor'
import Header from '@/components/Header'

export const metadata = {
  title: 'GitHub AI Workflow - AI Hack Mate',
  description: 'Analyze GitHub repositories and implement changes automatically with AI',
}

export default function GitHubPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="fade-in">
          <Header />
        </div>
        
        {/* GitHub Status Section */}
        <div className="mt-8 fade-in">
          <GitHubStatus />
        </div>
        
        {/* GitHub Workflow Section */}
        <div className="mt-8 fade-in">
          <GitHubWorkflow />
        </div>
        
        {/* Information Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 fade-in">
          {/* How it Works */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white text-lg">🔍</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">How it Works</h3>
            </div>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-start">
                <span className="text-blue-500 mr-2 font-bold">1.</span>
                <span>AI analyzes your repository structure, technologies, and patterns</span>
              </div>
              <div className="flex items-start">
                <span className="text-blue-500 mr-2 font-bold">2.</span>
                <span>Creates a detailed implementation plan based on your request</span>
              </div>
              <div className="flex items-start">
                <span className="text-blue-500 mr-2 font-bold">3.</span>
                <span>Executes tasks using specialized AI agents (Planner, Coder, Debugger)</span>
              </div>
              <div className="flex items-start">
                <span className="text-blue-500 mr-2 font-bold">4.</span>
                <span>Creates a new branch and implements changes</span>
              </div>
              <div className="flex items-start">
                <span className="text-blue-500 mr-2 font-bold">5.</span>
                <span>Automatically creates a pull request with detailed description</span>
              </div>
            </div>
          </div>

          {/* Supported Features */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white text-lg">✨</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Supported Features</h3>
            </div>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span>Multi-language support (JS, TS, Python, Java, etc.)</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span>Framework detection (React, Next.js, Vue, Angular)</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span>API endpoint implementation</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span>Bug fixes and improvements</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span>Test implementation</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span>Documentation updates</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span>Code refactoring</span>
              </div>
            </div>
          </div>

          {/* Best Practices */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white text-lg">💡</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Best Practices</h3>
            </div>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-start">
                <span className="text-purple-500 mr-2">•</span>
                <span>Be specific in your task description</span>
              </div>
              <div className="flex items-start">
                <span className="text-purple-500 mr-2">•</span>
                <span>Mention file paths or components when relevant</span>
              </div>
              <div className="flex items-start">
                <span className="text-purple-500 mr-2">•</span>
                <span>Include expected behavior or requirements</span>
              </div>
              <div className="flex items-start">
                <span className="text-purple-500 mr-2">•</span>
                <span>Review the generated PR before merging</span>
              </div>
              <div className="flex items-start">
                <span className="text-purple-500 mr-2">•</span>
                <span>Test the changes in your development environment</span>
              </div>
            </div>
          </div>
        </div>

        {/* Example Tasks */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 fade-in">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            💡 Example Tasks
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">API Development</h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  "Add a /health endpoint that returns API status and version"
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  "Implement user authentication with JWT tokens"
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  "Create CRUD endpoints for the User model"
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Frontend Features</h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  "Add dark mode toggle to the header component"
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  "Implement responsive navigation menu"
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  "Add form validation to the contact form"
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center fade-in">
          <div className="inline-flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>GitHub integration ready</span>
            <span className="mx-2">•</span>
            <span>Powered by AI Hack Mate</span>
          </div>
        </div>
      </div>
      
      {/* Performance Monitor */}
      <PerformanceMonitor />
    </main>
  )
}
