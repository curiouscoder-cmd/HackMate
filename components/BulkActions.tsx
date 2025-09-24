'use client'

import { useState, useTransition } from 'react'
import { Check, RotateCw, Trash2, Download } from 'lucide-react'
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
            <span className="mr-2">{message.type === 'success' ? <Check className="w-4 h-4" /> : '❌'}</span>
            <span className="text-sm">{message.text}</span>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        <button 
          onClick={handleRetryFailed}
          disabled={isPending}
          className="btn-outline w-full text-left disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="font-medium text-foreground flex items-center">
            <RotateCw className="w-4 h-4 mr-2" />
            Retry All Failed Tasks
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Restart any tasks that have failed
          </div>
        </button>

        <button 
          onClick={handleClearCompleted}
          disabled={isPending}
          className="btn-outline w-full text-left disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="font-medium text-foreground flex items-center">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Completed Tasks
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Remove all completed tasks from view
          </div>
        </button>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="font-medium text-gray-900 mb-3 flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export Tasks
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={() => handleExport('json')}
              disabled={isPending}
              className="flex-1 btn-solid text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="font-semibold">Export JSON</div>
            </button>
            <button 
              onClick={() => handleExport('csv')}
              disabled={isPending}
              className="flex-1 btn-outline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="font-semibold">Export CSV</div>
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
