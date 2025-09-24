'use server'

import { revalidatePath } from 'next/cache';
import { TaskRunner } from '@/lib/core/task-runner';
import { Task } from '@/lib/agents/planner-agent';

// Global task runner instance for server actions
let taskRunnerInstance: TaskRunner | null = null;
let initializationPromise: Promise<TaskRunner> | null = null;

// Optimized task runner getter with singleton pattern and lazy initialization
async function getTaskRunner(): Promise<TaskRunner> {
  if (taskRunnerInstance) {
    return taskRunnerInstance;
  }

  // If initialization is already in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = (async () => {
    try {
      console.log('🚀 Initializing TaskRunner...');
      const startTime = Date.now();
      
      taskRunnerInstance = new TaskRunner({
        enableAI: !!process.env.GEMINI_API_KEY,
        enableGitHub: !!process.env.GITHUB_TOKEN,
        enableSlack: !!process.env.SLACK_BOT_TOKEN,
        enableMemory: !!process.env.PINECONE_API_KEY
      });
      
      await taskRunnerInstance.initialize();
      
      const initTime = Date.now() - startTime;
      console.log(`✅ TaskRunner initialized in ${initTime}ms`);
      
      return taskRunnerInstance;
    } catch (error) {
      console.error('❌ TaskRunner initialization failed:', error);
      // Reset so we can try again later
      taskRunnerInstance = null;
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

export async function createTaskAction(problem: string): Promise<{ success: boolean; taskId?: string; error?: string }> {
  try {
    if (!problem?.trim()) {
      return { success: false, error: 'Problem statement is required' };
    }

    const runner = await getTaskRunner();
    const taskId = await runner.createTaskFromProblem(problem.trim());
    
    // Invalidate task cache
    taskCache = null;
    
    // Revalidate the tasks page to show new data
    revalidatePath('/');
    revalidatePath('/api/tasks');
    
    return { success: true, taskId };
  } catch (error) {
    console.error('Error creating task:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create task' 
    };
  }
}

// Simple cache for tasks to avoid repeated initialization
let taskCache: { tasks: Task[]; timestamp: number } | null = null;
const CACHE_DURATION = 5000; // 5 seconds cache

export async function getTasksAction(): Promise<{ success: boolean; tasks?: Task[]; error?: string }> {
  try {
    // Return cached tasks if available and fresh
    if (taskCache && Date.now() - taskCache.timestamp < CACHE_DURATION) {
      return { success: true, tasks: taskCache.tasks };
    }

    const runner = await getTaskRunner();
    const tasks = await runner.getAllTasks();
    
    // Update cache
    taskCache = { tasks, timestamp: Date.now() };
    
    return { success: true, tasks };
  } catch (error) {
    console.error('Error fetching tasks:', error);
    
    // Return cached tasks if available, even if stale
    if (taskCache) {
      console.log('Returning stale cached tasks due to error');
      return { success: true, tasks: taskCache.tasks };
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch tasks' 
    };
  }
}

export async function getTaskAction(taskId: string): Promise<{ success: boolean; task?: Task; error?: string }> {
  try {
    const runner = await getTaskRunner();
    const task = await runner.getTask(taskId);
    
    if (!task) {
      return { success: false, error: 'Task not found' };
    }
    
    return { success: true, task };
  } catch (error) {
    console.error('Error fetching task:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch task' 
    };
  }
}

export async function retryTaskAction(taskId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const runner = await getTaskRunner();
    await runner.retryTask(taskId);
    
    // Revalidate to show updated task status
    revalidatePath('/');
    revalidatePath('/api/tasks');
    
    return { success: true };
  } catch (error) {
    console.error('Error retrying task:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to retry task' 
    };
  }
}

export async function getAgentStatusAction(): Promise<{ success: boolean; agents?: any; error?: string }> {
  try {
    const runner = await getTaskRunner();
    const status = runner.getAgentStatus();
    
    return { success: true, agents: status };
  } catch (error) {
    console.error('Error getting agent status:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get agent status' 
    };
  }
}

export async function bulkRetryFailedTasksAction(): Promise<{ success: boolean; retriedCount?: number; error?: string }> {
  try {
    const runner = await getTaskRunner();
    const tasks = await runner.getAllTasks();
    const failedTasks = tasks.filter(task => task.status === 'failed');
    
    let retriedCount = 0;
    for (const task of failedTasks) {
      try {
        await runner.retryTask(task.id);
        retriedCount++;
      } catch (error) {
        console.error(`Failed to retry task ${task.id}:`, error);
      }
    }
    
    // Revalidate to show updated task status
    revalidatePath('/');
    revalidatePath('/api/tasks');
    revalidatePath('/dashboard');
    
    return { success: true, retriedCount };
  } catch (error) {
    console.error('Error retrying failed tasks:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to retry failed tasks' 
    };
  }
}

export async function clearCompletedTasksAction(): Promise<{ success: boolean; clearedCount?: number; error?: string }> {
  try {
    const runner = await getTaskRunner();
    const tasks = await runner.getAllTasks();
    const completedTasks = tasks.filter(task => task.status === 'done');
    
    let clearedCount = 0;
    for (const task of completedTasks) {
      try {
        // In a real implementation, you'd have a deleteTask method
        // For now, we'll just mark them as archived in metadata
        task.metadata = { ...task.metadata, archived: true };
        clearedCount++;
      } catch (error) {
        console.error(`Failed to clear task ${task.id}:`, error);
      }
    }
    
    // Revalidate to show updated task list
    revalidatePath('/');
    revalidatePath('/api/tasks');
    revalidatePath('/dashboard');
    
    return { success: true, clearedCount };
  } catch (error) {
    console.error('Error clearing completed tasks:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to clear completed tasks' 
    };
  }
}

export async function exportTasksAction(format: 'json' | 'csv'): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const runner = await getTaskRunner();
    const tasks = await runner.getAllTasks();
    
    let data: string;
    
    if (format === 'json') {
      data = JSON.stringify(tasks, null, 2);
    } else {
      // CSV format
      const headers = ['ID', 'Title', 'Description', 'Status', 'Agent', 'Created', 'Updated'];
      const rows = tasks.map(task => [
        task.id,
        task.title,
        task.description,
        task.status,
        task.agent,
        task.createdAt,
        task.updatedAt
      ]);
      
      data = [headers, ...rows].map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error exporting tasks:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to export tasks' 
    };
  }
}
