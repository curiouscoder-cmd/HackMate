'use client'

import { useState, useTransition } from 'react'
import { Check, X, Target as TargetIcon, Rocket, Lightbulb } from 'lucide-react'
import { createTaskAction } from '@/lib/actions/task-actions'

export default function ProblemInputSSR() {
  const [problem, setProblem] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!problem.trim()) return

    setError(null)
    setSuccess(null)

    startTransition(async () => {
      try {
        const result = await createTaskAction(problem.trim())
        
        if (result.success) {
          setProblem('')
          setSuccess('Task created successfully! Check the task board for updates.')
          // Clear success message after 3 seconds
          setTimeout(() => setSuccess(null), 3000)
        } else {
          setError(result.error || 'Failed to create task')
        }
      } catch (error) {
        setError('An unexpected error occurred')
        console.error('Error creating task:', error)
      }
    })
  }

  const exampleProblems = [
    "Add a /health endpoint to the API",
    "Implement user authentication with JWT",
    "Create a responsive dashboard component",
    "Add unit tests for the user service",
    "Set up CI/CD pipeline with GitHub Actions"
  ]

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 inline-flex items-center">
        <TargetIcon className="w-5 h-5 mr-2" /> Problem Statement
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="problem" className="block text-sm font-medium text-gray-700 mb-2">
            Describe what you want to build or fix:
          </label>
          <textarea
            id="problem"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="e.g., Add a /health endpoint to check server status"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            disabled={isPending}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-500"><X className="w-4 h-4" /></span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-green-500"><Check className="w-4 h-4" /></span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}
        
        <button
          type="submit"
          disabled={!problem.trim() || isPending}
          className="btn-solid w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Tasks...
            </span>
          ) : (
            <span className="inline-flex items-center justify-center"><Rocket className="w-5 h-5 mr-2" /> Start Planning</span>
          )}
        </button>
      </form>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3 inline-flex items-center"><Lightbulb className="w-4 h-4 mr-2" /> Example Problems:</h3>
        <div className="space-y-2">
          {exampleProblems.map((example, index) => (
            <button
              key={index}
              onClick={() => setProblem(example)}
              disabled={isPending}
              className="w-full text-left text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-md transition-colors duration-200 disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
