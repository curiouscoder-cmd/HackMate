'use client'

import { useState, useTransition, ReactNode } from 'react'
import { Brain, Code2, Bug, Megaphone, Bot, RotateCw, ClipboardList } from 'lucide-react'
import { retryTaskAction } from '@/lib/actions/task-actions'

interface Task {
  id: string
  title: string
  description: string
  status: 'queued' | 'in_progress' | 'done' | 'failed'
  agent: string
  createdAt: string
  updatedAt: string
  logs: string[]
  metadata?: any
}

interface TaskCardProps {
  task: Task
}

export default function TaskCard({ task }: TaskCardProps) {
  const [showLogs, setShowLogs] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleRetry = () => {
    startTransition(async () => {
      try {
        await retryTaskAction(task.id)
      } catch (error) {
        console.error('Failed to retry task:', error)
      }
    })
  }

  const getAgentIcon = (agent: string): ReactNode => {
    switch (agent) {
      case 'planner': return <Brain className="w-4 h-4 text-primary-700" />
      case 'coder': return <Code2 className="w-4 h-4 text-primary-700" />
      case 'debugger': return <Bug className="w-4 h-4 text-primary-700" />
      case 'pm': return <Megaphone className="w-4 h-4 text-primary-700" />
      default: return <Bot className="w-4 h-4 text-primary-700" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return 'status-queued'
      case 'in_progress': return 'status-in-progress'
      case 'done': return 'status-done'
      case 'failed': return 'status-failed'
      default: return 'status-queued'
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="task-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <span className="flex-shrink-0">{getAgentIcon(task.agent)}</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 text-sm truncate">
              {task.title}
            </h4>
            <p className="text-xs text-gray-600 truncate">
              {task.description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
          <span className="text-xs text-gray-500">{formatTime(task.updatedAt)}</span>
          {task.status === 'failed' && (
            <button
              onClick={handleRetry}
              disabled={isPending}
              className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50 text-xs inline-flex items-center"
            >
              <RotateCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
            </button>
          )}
          {task.logs.length > 0 && (
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="text-blue-600 hover:text-blue-700 font-medium text-xs inline-flex items-center"
            >
              <ClipboardList className="w-4 h-4 mr-1" />{task.logs.length}
            </button>
          )}
          <span className={`status-badge ${getStatusColor(task.status)} text-xs px-2 py-0.5 flex-shrink-0`}>
            {task.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {showLogs && task.logs.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="bg-gray-50 rounded p-2 max-h-24 overflow-y-auto">
            {task.logs.map((log, index) => (
              <div key={index} className="text-xs text-gray-700 mb-0.5 font-mono leading-tight">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {task.metadata?.prUrl && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <a
            href={task.metadata.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs text-primary-600 hover:text-primary-700"
          >
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            View PR
          </a>
        </div>
      )}
    </div>
  )
}
