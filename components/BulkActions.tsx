'use client'

import { useState, useTransition } from 'react'
import { bulkRetryFailedTasksAction, clearCompletedTasksAction, exportTasksAction } from '@/lib/actions/task-actions'

export default function BulkActions() {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleRetryFailed = () => {
    startTransition(async () => {
      const result = await bulkRetryFailedTasksAction()
      if (result.success) {
        showMessage('success', `Retried ${result.retriedCount} failed tasks`)
      } else {
        showMessage('error', result.error || 'Failed to retry tasks')
      }
    })
  }

  const handleClearCompleted = () => {
    startTransition(async () => {
      const result = await clearCompletedTasksAction()
      if (result.success) {
        showMessage('success', `Cleared ${result.clearedCount} completed tasks`)
      } else {
        showMessage('error', result.error || 'Failed to clear tasks')
      }
    })
  }

  const handleExport = (format: 'json' | 'csv') => {
    startTransition(async () => {
      const result = await exportTasksAction(format)
      if (result.success && result.data) {
        // Create and download file
        const blob = new Blob([result.data], { 
          type: format === 'json' ? 'application/json' : 'text/csv' 
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `tasks_${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        showMessage('success', `Tasks exported as ${format.toUpperCase()}`)
      } else {
        showMessage('error', result.error || 'Failed to export tasks')
      }
    })
  }

  return (
    <div className="premium-card">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mr-3">
          <span className="text-white text-lg">🚀</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Bulk Actions</h3>
          <p className="text-sm text-gray-500">Manage multiple tasks at once</p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
        }`}>
          <div className="flex items-center">
            <span className="mr-2">{message.type === 'success' ? '✅' : '❌'}</span>
            <span className="text-sm">{message.text}</span>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        <button 
          onClick={handleRetryFailed}
          disabled={isPending}
          className="w-full text-left p-4 rounded-xl border border-gray-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="font-medium text-gray-900 flex items-center group-hover:text-blue-700">
            <span className="mr-3 text-lg">🔄</span>
            Retry All Failed Tasks
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Restart any tasks that have failed
          </div>
        </button>

        <button 
          onClick={handleClearCompleted}
          disabled={isPending}
          className="w-full text-left p-4 rounded-xl border border-gray-200 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:border-green-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="font-medium text-gray-900 flex items-center group-hover:text-green-700">
            <span className="mr-3 text-lg">🧹</span>
            Clear Completed Tasks
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Remove all completed tasks from view
          </div>
        </button>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="font-medium text-gray-900 mb-3 flex items-center">
            <span className="mr-3 text-lg">📥</span>
            Export Tasks
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={() => handleExport('json')}
              disabled={isPending}
              className="flex-1 px-4 py-3 text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="font-medium">Export JSON</div>
              <div className="text-xs opacity-90">Structured data</div>
            </button>
            <button 
              onClick={() => handleExport('csv')}
              disabled={isPending}
              className="flex-1 px-4 py-3 text-sm bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="font-medium">Export CSV</div>
              <div className="text-xs opacity-90">Spreadsheet format</div>
            </button>
          </div>
        </div>
      </div>

      {isPending && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Processing...</span>
        </div>
      )}
    </div>
  )
}
