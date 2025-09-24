'use client'

import { useState, useEffect } from 'react'
import { Check, X, BarChart3, Inbox, ClipboardList, Zap } from 'lucide-react'
import TaskCard from './TaskCard'

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

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks')
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    
    // Listen for task creation events
    const handleTaskCreated = () => {
      fetchTasks()
    }
    
    window.addEventListener('taskCreated', handleTaskCreated)
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchTasks, 3000)
    
    return () => {
      window.removeEventListener('taskCreated', handleTaskCreated)
      clearInterval(interval)
    }
  }, [])

  const tasksByStatus = {
    queued: tasks.filter(task => task.status === 'queued'),
    in_progress: tasks.filter(task => task.status === 'in_progress'),
    done: tasks.filter(task => task.status === 'done'),
    failed: tasks.filter(task => task.status === 'failed'),
  }

  const statusConfig = {
    queued: { title: (<span className="inline-flex items-center"><ClipboardList className="w-4 h-4 mr-1 text-gray-600" /> Queued</span>), color: 'bg-gray-50 border-gray-200' },
    in_progress: { title: (<span className="inline-flex items-center"><Zap className="w-4 h-4 mr-1 text-primary-600" /> In Progress</span>), color: 'bg-primary-50 border-primary-200' },
    done: { title: (<span className="inline-flex items-center"><Check className="w-4 h-4 mr-1 text-green-600" /> Done</span>), color: 'bg-success-50 border-success-200' },
    failed: { title: (<span className="inline-flex items-center"><X className="w-4 h-4 mr-1 text-red-600" /> Failed</span>), color: 'bg-error-50 border-error-200' },
  }

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 inline-flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" /> Live Task Board
        </h2>
        <div className="text-sm text-gray-500">
          {tasks.length} total tasks
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(statusConfig).map(([status, config]) => (
          <div key={status} className={`rounded-lg border-2 ${config.color} p-4`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">{config.title}</h3>
              <span className="text-sm text-gray-500">
                {tasksByStatus[status as keyof typeof tasksByStatus].length}
              </span>
            </div>
            
            <div className="space-y-3">
              {tasksByStatus[status as keyof typeof tasksByStatus].map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
              
              {tasksByStatus[status as keyof typeof tasksByStatus].length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Inbox className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-sm">No tasks</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
